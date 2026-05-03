const express = require("express");
const router = express.Router();
const pdf = require("../services/pdf");
const metaAds = require("../services/metaAds");
const logger = require("../utils/logger");

// GET /reports/awb - AWB report PDF (requires shipments from tracking router)
// This route is mounted with access to the shared shipments store via middleware
router.get("/awb", async (req, res) => {
  const shipments = req.app.locals.shipments || [];
  try {
    const pdfBuffer = await pdf.generateAWBReport(
      shipments.map((s) => ({ ...s, date: s.createdAt?.split("T")[0] }))
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="awb-report.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("AWB report error", { error: err.message });
    res.status(500).json({ error: "Error generando reporte AWB" });
  }
});

// GET /reports/ads - Meta Ads performance summary
router.get("/ads", async (req, res) => {
  const { period } = req.query;
  try {
    const data = await metaAds.getAdAccountInsights(
      "impressions,clicks,spend,reach,actions",
      period || "last_30d"
    );
    res.json(data);
  } catch (err) {
    logger.error("Ads report error", { error: err.message });
    res.status(500).json({ error: "Error obteniendo reporte de anuncios" });
  }
});

// GET /reports/health - System health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      whatsapp: !!process.env.WHATSAPP_TOKEN,
      metaAds: !!process.env.META_ADS_TOKEN,
      gmail: !!process.env.GMAIL_USER,
      googleSheets: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      claudeAI: !!process.env.ANTHROPIC_API_KEY,
    },
  });
});

module.exports = router;
