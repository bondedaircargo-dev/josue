const express = require("express");
const router = express.Router();
const metaAds = require("../services/metaAds");
const wa = require("../services/whatsapp");
const { formatPhone } = require("../utils/helpers");
const logger = require("../utils/logger");

// GET /campaigns/insights - Ad account performance
router.get("/insights", async (req, res) => {
  const { fields, date_preset } = req.query;
  try {
    const data = await metaAds.getAdAccountInsights(fields, date_preset || "last_7d");
    res.json(data);
  } catch (err) {
    logger.error("Meta Ads insights error", { error: err.message });
    res.status(500).json({ error: "Error obteniendo insights de Meta Ads" });
  }
});

// GET /campaigns/list - List campaigns
router.get("/list", async (req, res) => {
  const { status } = req.query;
  try {
    const data = await metaAds.getCampaigns(status || "ACTIVE");
    res.json(data);
  } catch (err) {
    logger.error("Meta Ads campaigns list error", { error: err.message });
    res.status(500).json({ error: "Error obteniendo campañas" });
  }
});

// POST /campaigns - Create new campaign
router.post("/", async (req, res) => {
  const { name, objective, dailyBudget, startTime, stopTime } = req.body;
  if (!name || !objective || !dailyBudget) {
    return res.status(400).json({ error: "name, objective y dailyBudget son requeridos" });
  }
  try {
    const data = await metaAds.createCampaign({ name, objective, dailyBudget, startTime, stopTime });
    res.status(201).json({ success: true, campaign: data });
  } catch (err) {
    logger.error("Meta Ads create campaign error", { error: err.message });
    res.status(500).json({ error: "Error creando campaña" });
  }
});

// GET /campaigns/leads/:formId - Get leads from a lead form
router.get("/leads/:formId", async (req, res) => {
  try {
    const data = await metaAds.getLeads(req.params.formId);
    res.json(data);
  } catch (err) {
    logger.error("Meta Ads leads error", { error: err.message });
    res.status(500).json({ error: "Error obteniendo leads" });
  }
});

// POST /campaigns/leads/notify - Receive lead webhook from Meta and notify via WhatsApp
router.post("/leads/notify", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  logger.info("Lead webhook received", body);

  // Meta Leads webhook format
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const lead = change?.value;

  if (!lead?.leadgen_id) return;

  // Extract fields from lead_data if available
  const fields = {};
  if (lead.field_data) {
    for (const f of lead.field_data) {
      fields[f.name] = f.values?.[0];
    }
  }

  const phone = formatPhone(fields.phone_number || fields.phone || "");
  const name = fields.full_name || fields.first_name || "Nuevo lead";

  logger.info(`New lead: ${name} | phone: ${phone}`);

  // Notify via WhatsApp if phone available
  if (phone) {
    try {
      await wa.sendText(
        phone,
        `Hola ${name}! Somos Bonded Air Cargo. Recibimos tu solicitud de información sobre nuestros servicios de envío Miami → RD/Haití. ¿En qué podemos ayudarte?`
      );
    } catch (err) {
      logger.warn("Lead WhatsApp notification failed", { error: err.message });
    }
  }
});

module.exports = router;
