const express = require("express");
const router = express.Router();
const pdfService = require("../services/pdf");
const gmail = require("../services/gmail");
const wa = require("../services/whatsapp");
const { getCompanyById } = require("../config/companies");
const { generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");

// In-memory invoice store — replace with DB in production
const invoices = new Map();

// ─── GET /invoices — List invoices ────────────────────────────────────────────
router.get("/", (req, res) => {
  const { status, company } = req.query;
  let list = Array.from(invoices.values());

  if (status) list = list.filter((i) => i.status === status);
  if (company) list = list.filter((i) => i.company === company.toUpperCase());

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ total: list.length, invoices: list });
});

// ─── GET /invoices/:crn — Get invoice ────────────────────────────────────────
router.get("/:crn", (req, res) => {
  const invoice = invoices.get(req.params.crn.toUpperCase());
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });
  res.json(invoice);
});

// ─── POST /invoices — Create invoice ─────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    shipmentCrn,
    destination,
    items,
    taxRate,
    notes,
    company: companyId,
  } = req.body;

  if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "customerName e items[] son requeridos" });
  }

  const company = getCompanyById(companyId);
  const crn = generateCRN(company.id, "INV");

  const invoice = {
    crn,
    company: company.id,
    customerName,
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    shipmentCrn: shipmentCrn || null,
    destination: destination || null,
    items,
    taxRate: taxRate || 0,
    notes: notes || null,
    status: "PENDIENTE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  invoices.set(crn, invoice);
  logger.info(`Invoice created: ${crn} for ${company.id}`);
  res.status(201).json({ success: true, crn, invoice });
});

// ─── GET /invoices/:crn/pdf — Download PDF ───────────────────────────────────
router.get("/:crn/pdf", async (req, res) => {
  const invoice = invoices.get(req.params.crn.toUpperCase());
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });

  try {
    const pdfBuffer = await pdfService.generateInvoice({
      ...invoice,
      number: invoice.crn,
      awb: invoice.shipmentCrn,
    });
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.crn}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Invoice PDF failed", { error: err.message });
    res.status(500).json({ error: "Error generando PDF" });
  }
});

// ─── POST /invoices/:crn/send — Email invoice ────────────────────────────────
router.post("/:crn/send", async (req, res) => {
  const invoice = invoices.get(req.params.crn.toUpperCase());
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });
  if (!invoice.customerEmail) {
    return res.status(400).json({ error: "Cliente sin email registrado" });
  }

  try {
    const pdfBuffer = await pdfService.generateInvoice({
      ...invoice,
      number: invoice.crn,
      awb: invoice.shipmentCrn,
    });
    await gmail.sendInvoiceEmail(
      { name: invoice.customerName, email: invoice.customerEmail },
      invoice.crn,
      pdfBuffer
    );
    invoice.sentAt = new Date().toISOString();
    invoices.set(invoice.crn, invoice);
    logger.info(`Invoice ${invoice.crn} emailed to ${invoice.customerEmail}`);
    res.json({ success: true });
  } catch (err) {
    logger.error("Invoice email failed", { error: err.message });
    res.status(500).json({ error: "Error enviando factura por email" });
  }
});

// ─── POST /invoices/:crn/whatsapp — Send invoice via WhatsApp ────────────────
router.post("/:crn/whatsapp", async (req, res) => {
  const invoice = invoices.get(req.params.crn.toUpperCase());
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });
  if (!invoice.customerPhone) {
    return res.status(400).json({ error: "Cliente sin teléfono registrado" });
  }

  const company = getCompanyById(invoice.company);
  const subtotal = (invoice.items || []).reduce(
    (s, i) => s + i.quantity * i.unitPrice,
    0
  );
  const tax = subtotal * (invoice.taxRate || 0);
  const total = subtotal + tax;

  try {
    await wa.sendText(
      invoice.customerPhone,
      `🧾 *Factura ${invoice.crn} — ${company.fullName}*\n\nCliente: ${invoice.customerName}\n${invoice.shipmentCrn ? `Envío CRN: ${invoice.shipmentCrn}` : ""}\n\nTotal: *$${total.toFixed(2)}*\n\nPara ver el PDF completo escríbenos.`,
      company
    );
    res.json({ success: true });
  } catch (err) {
    logger.error("Invoice WA failed", { error: err.message });
    res.status(500).json({ error: "Error enviando factura por WhatsApp" });
  }
});

// ─── PATCH /invoices/:crn/paid — Mark as paid ────────────────────────────────
router.patch("/:crn/paid", (req, res) => {
  const invoice = invoices.get(req.params.crn.toUpperCase());
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });

  invoice.status = "PAGADA";
  invoice.paidAt = new Date().toISOString();
  invoice.updatedAt = new Date().toISOString();
  invoices.set(invoice.crn, invoice);
  res.json({ success: true, invoice });
});

module.exports = router;
module.exports.invoices = invoices;
