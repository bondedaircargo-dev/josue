const express = require("express");
const router = express.Router();
const pdfService = require("../services/pdf");
const gmail = require("../services/gmail");
const { generateInvoiceNumber } = require("../utils/helpers");
const logger = require("../utils/logger");

// In-memory invoice store (replace with database in production)
const invoices = new Map();

// GET /invoices - List all invoices
router.get("/", (req, res) => {
  const list = Array.from(invoices.values());
  res.json({ total: list.length, invoices: list });
});

// GET /invoices/:number - Get invoice
router.get("/:number", (req, res) => {
  const invoice = invoices.get(req.params.number);
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });
  res.json(invoice);
});

// POST /invoices - Create invoice
router.post("/", async (req, res) => {
  const { customerName, customerPhone, customerEmail, awb, destination, items, taxRate, notes } = req.body;

  if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "customerName e items[] son requeridos" });
  }

  const number = generateInvoiceNumber();
  const invoice = {
    number,
    customerName,
    customerPhone,
    customerEmail,
    awb,
    destination,
    items,
    taxRate: taxRate || 0,
    notes,
    createdAt: new Date().toISOString(),
    status: "PENDIENTE",
  };

  invoices.set(number, invoice);
  logger.info(`Invoice created: ${number}`);
  res.status(201).json({ success: true, invoiceNumber: number, invoice });
});

// GET /invoices/:number/pdf - Download invoice PDF
router.get("/:number/pdf", async (req, res) => {
  const invoice = invoices.get(req.params.number);
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });

  try {
    const pdfBuffer = await pdfService.generateInvoice(invoice);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Invoice PDF generation failed", { error: err.message });
    res.status(500).json({ error: "Error generando PDF" });
  }
});

// POST /invoices/:number/send - Email invoice to customer
router.post("/:number/send", async (req, res) => {
  const invoice = invoices.get(req.params.number);
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });
  if (!invoice.customerEmail) return res.status(400).json({ error: "Cliente sin email registrado" });

  try {
    const pdfBuffer = await pdfService.generateInvoice(invoice);
    await gmail.sendInvoiceEmail(
      { name: invoice.customerName, email: invoice.customerEmail },
      invoice.number,
      pdfBuffer
    );
    invoice.sentAt = new Date().toISOString();
    invoices.set(invoice.number, invoice);
    logger.info(`Invoice ${invoice.number} emailed to ${invoice.customerEmail}`);
    res.json({ success: true });
  } catch (err) {
    logger.error("Invoice email failed", { error: err.message });
    res.status(500).json({ error: "Error enviando factura por email" });
  }
});

// PATCH /invoices/:number/paid - Mark as paid
router.patch("/:number/paid", (req, res) => {
  const invoice = invoices.get(req.params.number);
  if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });
  invoice.status = "PAGADA";
  invoice.paidAt = new Date().toISOString();
  invoices.set(invoice.number, invoice);
  res.json({ success: true, invoice });
});

module.exports = router;
