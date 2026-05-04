const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const { getCompanyById } = require("../config/companies");
const { generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory store — replace with DB in production
const payments = new Map();

const PAYMENT_METHODS = ["zelle", "cash_app", "efectivo", "transferencia", "tarjeta", "otro"];
const PAYMENT_STATUSES = ["pendiente", "en_proceso", "confirmado", "rechazado", "reembolsado"];

// ─── GET /payments — List with filters ───────────────────────────────────────
router.get("/", (req, res) => {
  const { status, company, crn } = req.query;
  let list = Array.from(payments.values());

  if (status) list = list.filter((p) => p.status === status);
  if (company) list = list.filter((p) => p.company === company.toUpperCase());
  if (crn) list = list.filter((p) => p.relatedCrn === crn.toUpperCase());

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ total: list.length, payments: list });
});

// ─── GET /payments/pending — Pending payments summary ────────────────────────
router.get("/pending", (req, res) => {
  const { company } = req.query;
  let list = Array.from(payments.values()).filter((p) => p.status === "pendiente");

  if (company) list = list.filter((p) => p.company === company.toUpperCase());

  const total = list.reduce((sum, p) => sum + p.amount, 0);
  res.json({ count: list.length, totalAmount: total, payments: list });
});

// ─── GET /payments/:crn — Single payment ─────────────────────────────────────
router.get("/:crn", (req, res) => {
  const p = payments.get(req.params.crn.toUpperCase());
  if (!p) return res.status(404).json({ error: "Pago no encontrado" });
  res.json(p);
});

// ─── POST /payments — Register payment ───────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    customerName,
    customerPhone,
    amount,
    method,
    relatedCrn,
    description,
    company: companyId,
    proofUrl,
  } = req.body;

  if (!customerName || !customerPhone || !amount || !method) {
    return res.status(400).json({
      error: "customerName, customerPhone, amount y method son requeridos",
    });
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ error: `Métodos válidos: ${PAYMENT_METHODS.join(", ")}` });
  }

  const company = getCompanyById(companyId);
  const crn = generateCRN(company.id, "PAY");

  const payment = {
    crn,
    company: company.id,
    customerName,
    customerPhone,
    amount: parseFloat(amount),
    method,
    relatedCrn: relatedCrn || null,
    description: description || null,
    proofUrl: proofUrl || null,
    status: "pendiente",
    confirmedBy: null,
    statusHistory: [
      { status: "pendiente", date: new Date().toISOString(), note: "Pago registrado" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payments.set(crn, payment);
  logger.info(`Payment registered: ${crn} $${amount} via ${method}`);

  res.status(201).json({ success: true, crn, payment });
});

// ─── PATCH /payments/:crn/confirm — Confirm payment ─────────────────────────
router.patch("/:crn/confirm", async (req, res) => {
  const payment = payments.get(req.params.crn.toUpperCase());
  if (!payment) return res.status(404).json({ error: "Pago no encontrado" });

  const { agentId, note } = req.body;
  payment.status = "confirmado";
  payment.confirmedBy = agentId || "system";
  payment.statusHistory.push({
    status: "confirmado",
    date: new Date().toISOString(),
    note: note || "Pago confirmado",
  });
  payment.updatedAt = new Date().toISOString();
  payments.set(payment.crn, payment);

  logger.info(`Payment confirmed: ${payment.crn}`);

  const company = getCompanyById(payment.company);

  try {
    await wa.sendText(
      payment.customerPhone,
      `✅ *Pago Confirmado — ${company.fullName}*\n\nHola ${payment.customerName},\n\nTu pago fue confirmado:\n\n🔖 *Ref:* ${payment.crn}\n💰 *Monto:* $${payment.amount.toFixed(2)}\n💳 *Método:* ${payment.method.replace(/_/g, " ").toUpperCase()}\n\n${payment.relatedCrn ? `Envío: ${payment.relatedCrn}` : ""}\n\nGracias por tu pago.`,
      company
    );
  } catch (err) {
    logger.warn("Payment confirmation WA failed", { error: err.message });
  }

  res.json({ success: true, payment });
});

// ─── PATCH /payments/:crn/reject — Reject payment ───────────────────────────
router.patch("/:crn/reject", async (req, res) => {
  const payment = payments.get(req.params.crn.toUpperCase());
  if (!payment) return res.status(404).json({ error: "Pago no encontrado" });

  const { reason } = req.body;
  payment.status = "rechazado";
  payment.statusHistory.push({
    status: "rechazado",
    date: new Date().toISOString(),
    note: reason || "",
  });
  payment.updatedAt = new Date().toISOString();
  payments.set(payment.crn, payment);

  const company = getCompanyById(payment.company);

  try {
    await wa.sendText(
      payment.customerPhone,
      `⚠️ *Pago No Confirmado — ${company.fullName}*\n\nHola ${payment.customerName},\n\nNo pudimos confirmar tu pago *${payment.crn}*.\n\n${reason ? `Motivo: ${reason}` : "Por favor contáctanos para aclarar."}\n\nEscríbenos aquí para ayudarte.`,
      company
    );
  } catch (err) {
    logger.warn("Payment rejection WA failed", { error: err.message });
  }

  res.json({ success: true, payment });
});

// ─── POST /payments/reminder — Send payment reminder ────────────────────────
router.post("/reminder", async (req, res) => {
  const { customerPhone, customerName, crn, amount, company: companyId } = req.body;
  if (!customerPhone || !amount) {
    return res.status(400).json({ error: "customerPhone y amount son requeridos" });
  }

  const company = getCompanyById(companyId);

  try {
    await wa.sendText(
      customerPhone,
      templates.paymentReminder(customerName || "Cliente", crn || "N/A", parseFloat(amount), company),
      company
    );
    res.json({ success: true });
  } catch (err) {
    logger.error("Payment reminder WA failed", { error: err.message });
    res.status(500).json({ error: "Error enviando recordatorio" });
  }
});

module.exports = router;
module.exports.payments = payments;
