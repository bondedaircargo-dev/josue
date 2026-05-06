const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const {
  runHunt,
  enrichSingleProspect,
  getProspects,
  PROSPECTS_SHEET_HEADER,
} = require("../services/amazonSellerHunter");
const { CATEGORY_QUERIES } = require("../services/importRecords");
const { sendText } = require("../services/whatsapp");
const { sendEmail } = require("../services/gmail");

// ─── GET /amazon-hunter/categories ───────────────────────────────────────────
// List available search categories and their query terms
router.get("/categories", (req, res) => {
  res.json({
    categories: Object.keys(CATEGORY_QUERIES),
    queries: CATEGORY_QUERIES,
  });
});

// ─── POST /amazon-hunter/search ──────────────────────────────────────────────
// Trigger a hunt. Body: { category, maxQueries, enrichWithAI, saveToSheets, minAmazonScore }
router.post("/search", async (req, res) => {
  const {
    category = "all",
    maxQueries = 4,
    enrichWithAI = true,
    saveToSheets = true,
    minAmazonScore = 40,
  } = req.body;

  const validCategories = ["all", ...Object.keys(CATEGORY_QUERIES)];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: `Invalid category. Use: ${validCategories.join(", ")}`,
    });
  }

  logger.info(`Amazon hunter search triggered — category: ${category}`);

  try {
    const result = await runHunt({
      category,
      maxQueries: Math.min(parseInt(maxQueries) || 4, 10),
      enrichWithAI: enrichWithAI !== false,
      saveToSheets: saveToSheets !== false,
      minAmazonScore: parseInt(minAmazonScore) || 40,
    });

    res.json({
      ok: true,
      summary: result.summary,
      prospects: result.prospects.map(formatProspect),
    });
  } catch (err) {
    logger.error(`Hunt error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /amazon-hunter/prospects ────────────────────────────────────────────
// List all saved prospects from Google Sheets
router.get("/prospects", async (req, res) => {
  try {
    const prospects = await getProspects();
    const { status, bypassPotential } = req.query;

    let filtered = prospects;
    if (status) filtered = filtered.filter((p) => p.status?.toUpperCase() === status.toUpperCase());
    if (bypassPotential) filtered = filtered.filter((p) => p.bypassPotential?.toLowerCase() === bypassPotential.toLowerCase());

    res.json({ count: filtered.length, prospects: filtered });
  } catch (err) {
    logger.error(`Get prospects error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /amazon-hunter/enrich ──────────────────────────────────────────────
// Enrich a single prospect with AI. Body: { company, supplier, product, category, port, shipments, weight }
router.post("/enrich", async (req, res) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: "company is required" });

  try {
    const enriched = await enrichSingleProspect(req.body);
    res.json({ ok: true, prospect: formatProspect(enriched) });
  } catch (err) {
    logger.error(`Enrich error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /amazon-hunter/outreach ────────────────────────────────────────────
// Send WhatsApp or email outreach to a prospect
// Body: { company, contact, channel: "whatsapp"|"email", customMessage? }
router.post("/outreach", async (req, res) => {
  const { company, contact, channel = "whatsapp", customMessage } = req.body;

  if (!company || !contact) {
    return res.status(400).json({ error: "company and contact are required" });
  }

  const message =
    customMessage ||
    buildOutreachMessage(company);

  try {
    if (channel === "whatsapp") {
      await sendText(contact, message);
      logger.info(`WhatsApp outreach sent to ${contact} for ${company}`);
      res.json({ ok: true, channel: "whatsapp", to: contact });
    } else if (channel === "email") {
      await sendEmail({
        to: contact,
        subject: `Direct Air Freight from China — Better than Amazon FBA rates`,
        html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${message}</pre>`,
      });
      logger.info(`Email outreach sent to ${contact} for ${company}`);
      res.json({ ok: true, channel: "email", to: contact });
    } else {
      res.status(400).json({ error: "channel must be whatsapp or email" });
    }
  } catch (err) {
    logger.error(`Outreach error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /amazon-hunter/stats ────────────────────────────────────────────────
// Pipeline stats
router.get("/stats", async (req, res) => {
  try {
    const prospects = await getProspects();

    const stats = {
      total: prospects.length,
      byStatus: countBy(prospects, "status"),
      byPotential: countBy(prospects, "bypassPotential"),
      byCategory: countBy(prospects, "category"),
      avgAmazonScore:
        prospects.length
          ? Math.round(
              prospects.reduce((sum, p) => sum + (parseFloat(p.amazonScore) || 0), 0) /
                prospects.length
            )
          : 0,
      highPriority: prospects.filter(
        (p) => p.bypassPotential === "high" && p.status === "NEW"
      ).length,
    };

    res.json(stats);
  } catch (err) {
    logger.error(`Stats error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /amazon-hunter/sheet-header ─────────────────────────────────────────
// Returns expected column headers for the Google Sheet
router.get("/sheet-header", (req, res) => {
  res.json({ headers: PROSPECTS_SHEET_HEADER });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProspect(p) {
  return {
    company: p.company,
    category: p.category,
    supplier: p.supplierName || p.supplier,
    productDescription: p.productDescription,
    portOfEntry: p.portOfEntry,
    weightKg: p.weightKg,
    shipmentCount: p.shipmentCount,
    amazonScore: p.amazonScore,
    bypassPotential: p.ai?.bypassPotential || p.bypassPotential,
    confidence: p.ai?.confidence,
    reasoning: p.ai?.reasoning,
    pitch: p.ai?.pitch,
    estimatedMonthlyVolumeLbs: p.ai?.estimatedMonthlyVolumeLbs,
    recommendedService: p.ai?.recommendedService,
  };
}

function buildOutreachMessage(company) {
  return (
    `Hi! I'm reaching out from Bonded Air Cargo, a licensed air freight forwarder based in Miami.\n\n` +
    `We noticed ${company} imports products from China and wondered if you'd be interested in a direct freight solution that could help you:\n\n` +
    `✅ Reduce shipping costs vs Amazon FBA inbound rates\n` +
    `✅ Faster China → Miami air freight (5-8 days)\n` +
    `✅ Full customs clearance handled by us\n` +
    `✅ Flexible re-distribution once in Miami\n\n` +
    `Would you be open to a quick call to see if we can save you money on your import costs?\n\n` +
    `— Bonded Air Cargo | Miami, FL | bondedaircargo.com`
  );
}

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || "unknown";
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

module.exports = router;
