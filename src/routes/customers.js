const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const sheets = require("../services/sheets");
const { getCompanyById } = require("../config/companies");
const { formatPhone, generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");

// In-memory CRM — replace with DB in production
const customers = new Map();

// ─── GET /customers — List with optional filters ──────────────────────────────
router.get("/", (req, res) => {
  const { company, country, search } = req.query;
  let list = Array.from(customers.values());

  if (company) list = list.filter((c) => c.company === company.toUpperCase());
  if (country) list = list.filter((c) => c.country === country.toUpperCase());
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.crn?.toLowerCase().includes(s)
    );
  }

  res.json({ total: list.length, customers: list });
});

// ─── GET /customers/search — Lookup by CRN, phone, or email ──────────────────
router.get("/search", (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q es requerido" });

  const term = q.toLowerCase();
  const results = Array.from(customers.values()).filter(
    (c) =>
      c.crn?.toLowerCase() === term ||
      c.phone?.includes(term) ||
      c.email?.toLowerCase() === term
  );

  res.json({ total: results.length, customers: results });
});

// ─── GET /customers/:phone — Get by phone ────────────────────────────────────
router.get("/:phone", (req, res) => {
  const phone = formatPhone(req.params.phone);
  const customer = customers.get(phone);
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
  res.json(customer);
});

// ─── POST /customers — Register new customer ─────────────────────────────────
router.post("/", async (req, res) => {
  const { name, phone, email, address, country, company, tags, notes, tier } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "name y phone son requeridos" });

  const cleanPhone = formatPhone(phone);
  const companyId = (company || "MCP").toUpperCase();
  const crn = generateCRN(companyId, "CLI");

  const customer = {
    crn,
    id: cleanPhone,
    name,
    phone: cleanPhone,
    email: email || null,
    address: address || null,
    country: (country || "DO").toUpperCase(),
    company: companyId,
    tier: tier || "standard",
    tags: tags || [],
    notes: notes || null,
    shipments: [],
    totalSpent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  customers.set(cleanPhone, customer);
  logger.info(`Customer registered: ${name} (${cleanPhone}) → ${crn}`);

  try {
    await sheets.logCustomer(customer);
  } catch (err) {
    logger.warn("Sheets customer log failed", { error: err.message });
  }

  res.status(201).json({ success: true, crn, customer });
});

// ─── PATCH /customers/:phone — Update customer ───────────────────────────────
router.patch("/:phone", (req, res) => {
  const phone = formatPhone(req.params.phone);
  const customer = customers.get(phone);
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });

  const allowed = ["name", "email", "address", "country", "tier", "tags", "notes"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) customer[key] = req.body[key];
  }
  customer.updatedAt = new Date().toISOString();
  customers.set(phone, customer);
  res.json({ success: true, customer });
});

// ─── POST /customers/:phone/tag — Add tag ────────────────────────────────────
router.post("/:phone/tag", (req, res) => {
  const phone = formatPhone(req.params.phone);
  const customer = customers.get(phone);
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });

  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: "tag es requerido" });

  if (!customer.tags.includes(tag)) customer.tags.push(tag);
  customer.updatedAt = new Date().toISOString();
  customers.set(phone, customer);
  res.json({ success: true, tags: customer.tags });
});

// ─── POST /customers/:phone/message — Send WhatsApp message ──────────────────
router.post("/:phone/message", async (req, res) => {
  const phone = formatPhone(req.params.phone);
  const { message, companyId } = req.body;
  if (!message) return res.status(400).json({ error: "message es requerido" });

  const company = getCompanyById(companyId);

  try {
    await wa.sendText(phone, message, company);
    logger.info(`Custom message sent to ${phone} via ${company.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error("Send message failed", { error: err.message });
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// ─── POST /customers/broadcast — Bulk WhatsApp send ──────────────────────────
router.post("/broadcast", async (req, res) => {
  const { phones, message, companyId } = req.body;
  if (!phones || !Array.isArray(phones) || !message) {
    return res.status(400).json({ error: "phones (array) y message son requeridos" });
  }

  const company = getCompanyById(companyId);
  const results = [];

  for (const phone of phones) {
    const clean = formatPhone(phone);
    try {
      await wa.sendText(clean, message, company);
      results.push({ phone: clean, status: "sent" });
      // 1 msg/sec to respect rate limits
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      results.push({ phone: clean, status: "failed", error: err.message });
    }
  }

  logger.info(`Broadcast sent to ${phones.length} recipients via ${company.id}`);
  res.json({ success: true, results });
});

module.exports = router;
module.exports.customers = customers;
