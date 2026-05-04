const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const gmail = require("../services/gmail");
const sheets = require("../services/sheets");
const pdf = require("../services/pdf");
const { getCompanyById } = require("../config/companies");
const { generateAWB, generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory store — replace with DB in production
const shipments = new Map();

const VALID_STATUSES = [
  "RECIBIDO",
  "ALMACEN",
  "EN_TRANSITO",
  "EN_ADUANA",
  "DISPONIBLE",
  "ENTREGADO",
  "RETENIDO",
];

// ─── GET /tracking — List all shipments ──────────────────────────────────────
router.get("/", (req, res) => {
  const { status, company, destination } = req.query;
  let list = Array.from(shipments.values());

  if (status) list = list.filter((s) => s.status === status.toUpperCase());
  if (company) list = list.filter((s) => s.company === company.toUpperCase());
  if (destination) {
    const d = destination.toLowerCase();
    list = list.filter((s) => s.destination?.toLowerCase().includes(d));
  }

  res.json({ total: list.length, shipments: list });
});

// ─── GET /tracking/:ref — Query by CRN or AWB ────────────────────────────────
router.get("/:ref", (req, res) => {
  const ref = req.params.ref.toUpperCase();

  // Search by CRN first, then AWB
  let shipment = shipments.get(ref);
  if (!shipment) {
    shipment = Array.from(shipments.values()).find((s) => s.awb === ref);
  }

  if (!shipment) return res.status(404).json({ error: "Envío no encontrado" });
  res.json(shipment);
});

// ─── POST /tracking — Create new shipment ────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    destination,
    weight,
    pieces,
    description,
    value,
    notes,
    flightDate,
    flightNumber,
    company: companyId,
    shipperName,
    customerAddress,
    destinationAirport,
  } = req.body;

  if (!customerName || !customerPhone || !destination || !weight) {
    return res.status(400).json({
      error: "Campos requeridos: customerName, customerPhone, destination, weight",
    });
  }

  const company = getCompanyById(companyId);
  const awb = generateAWB(company.id);
  const crn = generateCRN(company.id, "SHP");

  const shipment = {
    crn,
    awb,
    company: company.id,
    customerName,
    customerPhone,
    customerEmail: customerEmail || null,
    customerAddress: customerAddress || null,
    shipperName: shipperName || company.fullName,
    destination,
    destinationAirport: destinationAirport || null,
    weight: parseFloat(weight),
    pieces: parseInt(pieces) || 1,
    description: description || "General cargo",
    value: parseFloat(value) || 0,
    notes: notes || null,
    flightDate: flightDate || null,
    flightNumber: flightNumber || null,
    status: "RECIBIDO",
    statusHistory: [
      { status: "RECIBIDO", date: new Date().toISOString(), note: "Envío registrado" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Index by CRN (primary) and AWB (secondary)
  shipments.set(crn, shipment);
  logger.info(`Shipment created: ${crn} / ${awb}`);

  // WhatsApp notification
  try {
    const msg = templates.shipmentCreated(
      customerName,
      crn,
      awb,
      destination,
      weight,
      company
    );
    await wa.sendText(customerPhone, msg, company);
  } catch (err) {
    logger.warn("WhatsApp notification failed", { error: err.message });
  }

  // Google Sheets log
  try {
    await sheets.logShipment({ ...shipment, invoiceNumber: "" });
  } catch (err) {
    logger.warn("Sheets log failed", { error: err.message });
  }

  res.status(201).json({ success: true, crn, awb, shipment });
});

// ─── PATCH /tracking/:ref/status — Update shipment status ────────────────────
router.patch("/:ref/status", async (req, res) => {
  const ref = req.params.ref.toUpperCase();
  const shipment = shipments.get(ref) || Array.from(shipments.values()).find((s) => s.awb === ref);

  if (!shipment) return res.status(404).json({ error: "Envío no encontrado" });

  const { status, note } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Estados válidos: ${VALID_STATUSES.join(", ")}` });
  }

  shipment.status = status;
  shipment.statusHistory.push({ status, date: new Date().toISOString(), note: note || "" });
  shipment.updatedAt = new Date().toISOString();
  shipments.set(shipment.crn, shipment);

  logger.info(`Shipment ${shipment.crn} → ${status}`);

  const company = getCompanyById(shipment.company);

  // WhatsApp notification
  try {
    const msg = templates.statusUpdate(
      shipment.customerName,
      shipment.crn,
      status,
      note,
      company
    );
    await wa.sendText(shipment.customerPhone, msg, company);
  } catch (err) {
    logger.warn("WhatsApp status notification failed", { error: err.message });
  }

  // Email notification
  if (shipment.customerEmail) {
    try {
      await gmail.sendTrackingEmail(
        { name: shipment.customerName, email: shipment.customerEmail },
        { ...shipment, awb: shipment.crn }
      );
    } catch (err) {
      logger.warn("Email notification failed", { error: err.message });
    }
  }

  res.json({ success: true, shipment });
});

// ─── GET /tracking/:ref/prealert — Pre-alert PDF ─────────────────────────────
router.get("/:ref/prealert", async (req, res) => {
  const ref = req.params.ref.toUpperCase();
  const shipment = shipments.get(ref) || Array.from(shipments.values()).find((s) => s.awb === ref);

  if (!shipment) return res.status(404).json({ error: "Envío no encontrado" });

  try {
    const pdfBuffer = await pdf.generatePreAlert(shipment);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prealert-${shipment.crn}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Pre-alert PDF failed", { error: err.message });
    res.status(500).json({ error: "Error generando PDF" });
  }
});

// ─── GET /tracking/report/pdf — AWB report PDF ───────────────────────────────
router.get("/report/pdf", async (req, res) => {
  try {
    const list = Array.from(shipments.values()).map((s) => ({
      ...s,
      date: s.createdAt?.split("T")[0],
    }));
    const pdfBuffer = await pdf.generateAWBReport(list);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="shipment-report-${Date.now()}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("AWB report PDF failed", { error: err.message });
    res.status(500).json({ error: "Error generando reporte" });
  }
});

module.exports = router;
module.exports.shipments = shipments;
