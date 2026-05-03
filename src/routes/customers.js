const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const sheets = require("../services/sheets");
const { formatPhone } = require("../utils/helpers");
const logger = require("../utils/logger");

// In-memory CRM (replace with database in production)
const customers = new Map();

// GET /customers - List all customers
router.get("/", (req, res) => {
  const list = Array.from(customers.values());
  res.json({ total: list.length, customers: list });
});

// GET /customers/:phone - Get customer by phone
router.get("/:phone", (req, res) => {
  const phone = formatPhone(req.params.phone);
  const customer = customers.get(phone);
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
  res.json(customer);
});

// POST /customers - Register new customer
router.post("/", async (req, res) => {
  const { name, phone, email, address, country } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "name y phone son requeridos" });

  const cleanPhone = formatPhone(phone);
  const customer = {
    id: cleanPhone,
    name,
    phone: cleanPhone,
    email,
    address,
    country: country || "DO",
    shipments: [],
    createdAt: new Date().toISOString(),
  };

  customers.set(cleanPhone, customer);
  logger.info(`Customer registered: ${name} (${cleanPhone})`);

  // Log to Sheets
  try {
    await sheets.logCustomer(customer);
  } catch (err) {
    logger.warn("Sheets customer log failed", { error: err.message });
  }

  res.status(201).json({ success: true, customer });
});

// PATCH /customers/:phone - Update customer
router.patch("/:phone", (req, res) => {
  const phone = formatPhone(req.params.phone);
  const customer = customers.get(phone);
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });

  const allowed = ["name", "email", "address", "country"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) customer[key] = req.body[key];
  }
  customer.updatedAt = new Date().toISOString();
  customers.set(phone, customer);
  res.json({ success: true, customer });
});

// POST /customers/:phone/message - Send custom WhatsApp message
router.post("/:phone/message", async (req, res) => {
  const phone = formatPhone(req.params.phone);
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message es requerido" });

  try {
    await wa.sendText(phone, message);
    logger.info(`Custom message sent to ${phone}`);
    res.json({ success: true });
  } catch (err) {
    logger.error("Send message failed", { error: err.message });
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// POST /customers/broadcast - Send message to multiple customers
router.post("/broadcast", async (req, res) => {
  const { phones, message } = req.body;
  if (!phones || !Array.isArray(phones) || !message) {
    return res.status(400).json({ error: "phones (array) y message son requeridos" });
  }

  const results = [];
  for (const phone of phones) {
    const cleanPhone = formatPhone(phone);
    try {
      await wa.sendText(cleanPhone, message);
      results.push({ phone: cleanPhone, status: "sent" });
      // Throttle to avoid rate limits (1 msg/sec)
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      results.push({ phone: cleanPhone, status: "failed", error: err.message });
    }
  }

  logger.info(`Broadcast sent to ${phones.length} recipients`);
  res.json({ success: true, results });
});

module.exports = router;
