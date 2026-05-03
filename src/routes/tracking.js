const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const gmail = require("../services/gmail");
const sheets = require("../services/sheets");
const pdf = require("../services/pdf");
const { generateAWB } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory store (replace with database in production)
const shipments = new Map();

// GET /tracking/:awb - Query tracking status
router.get("/:awb", (req, res) => {
  const { awb } = req.params;
  const shipment = shipments.get(awb);
  if (!shipment) return res.status(404).json({ error: "AWB no encontrado" });
  res.json(shipment);
});

// GET /tracking - List all shipments
router.get("/", (req, res) => {
  const list = Array.from(shipments.values());
  res.json({ total: list.length, shipments: list });
});

// POST /tracking - Create new shipment
router.post("/", async (req, res) => {
  const {
    customerName, customerPhone, customerEmail,
    destination, weight, pieces, description,
    value, notes, flightDate, flightNumber,
  } = req.body;

  if (!customerName || !customerPhone || !destination || !weight) {
    return res.status(400).json({ error: "Campos requeridos: customerName, customerPhone, destination, weight" });
  }

  const awb = generateAWB("BAC");
  const shipment = {
    awb,
    customerName,
    customerPhone,
    customerEmail,
    destination,
    weight: parseFloat(weight),
    pieces: parseInt(pieces) || 1,
    description: description || "General cargo",
    value: parseFloat(value) || 0,
    notes,
    flightDate,
    flightNumber,
    status: "RECIBIDO",
    statusHistory: [{ status: "RECIBIDO", date: new Date().toISOString(), note: "Envío registrado" }],
    createdAt: new Date().toISOString(),
  };

  shipments.set(awb, shipment);
  logger.info(`Shipment created: ${awb}`);

  // Notify customer via WhatsApp
  try {
    const msg = templates.shipmentCreated(customerName, awb, destination, weight);
    await wa.sendText(customerPhone, msg);
  } catch (err) {
    logger.warn("WhatsApp notification failed", { error: err.message });
  }

  // Log to Google Sheets
  try {
    await sheets.logShipment(shipment);
  } catch (err) {
    logger.warn("Sheets log failed", { error: err.message });
  }

  res.status(201).json({ success: true, awb, shipment });
});

// PATCH /tracking/:awb/status - Update status
router.patch("/:awb/status", async (req, res) => {
  const { awb } = req.params;
  const { status, note } = req.body;

  const shipment = shipments.get(awb);
  if (!shipment) return res.status(404).json({ error: "AWB no encontrado" });

  const validStatuses = ["RECIBIDO", "EN_TRANSITO", "EN_ADUANA", "EN_DESTINO", "ENTREGADO", "RETENIDO"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Estado inválido. Válidos: ${validStatuses.join(", ")}` });
  }

  shipment.status = status;
  shipment.statusHistory.push({ status, date: new Date().toISOString(), note: note || "" });
  shipment.updatedAt = new Date().toISOString();
  shipments.set(awb, shipment);

  logger.info(`Shipment ${awb} status updated to ${status}`);

  // Notify customer
  try {
    const msg = templates.statusUpdate(shipment.customerName, awb, status, note);
    await wa.sendText(shipment.customerPhone, msg);
  } catch (err) {
    logger.warn("WhatsApp status notification failed", { error: err.message });
  }

  // Send email if available
  if (shipment.customerEmail) {
    try {
      await gmail.sendTrackingEmail(
        { name: shipment.customerName, email: shipment.customerEmail },
        shipment
      );
    } catch (err) {
      logger.warn("Email notification failed", { error: err.message });
    }
  }

  res.json({ success: true, shipment });
});

// GET /tracking/:awb/prealert - Download pre-alert PDF
router.get("/:awb/prealert", async (req, res) => {
  const { awb } = req.params;
  const shipment = shipments.get(awb);
  if (!shipment) return res.status(404).json({ error: "AWB no encontrado" });

  try {
    const pdfBuffer = await pdf.generatePreAlert(shipment);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prealert-${awb}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Pre-alert PDF generation failed", { error: err.message });
    res.status(500).json({ error: "Error generando PDF" });
  }
});

// GET /tracking/report/pdf - Download AWB report
router.get("/report/pdf", async (req, res) => {
  try {
    const list = Array.from(shipments.values()).map((s) => ({
      ...s,
      date: s.createdAt?.split("T")[0],
    }));
    const pdfBuffer = await pdf.generateAWBReport(list);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="awb-report-${Date.now()}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("AWB report PDF generation failed", { error: err.message });
    res.status(500).json({ error: "Error generando reporte" });
  }
});

module.exports = router;
