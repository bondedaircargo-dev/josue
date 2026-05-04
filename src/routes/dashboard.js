const express = require("express");
const router = express.Router();
const metaAds = require("../services/metaAds");
const agentService = require("../services/agents");
const { getCategoryPriority } = require("../services/classifier");
const { COMPANIES } = require("../config/companies");
const logger = require("../utils/logger");

// ─── GET /dashboard — Main KPI dashboard ─────────────────────────────────────
router.get("/", async (req, res) => {
  const { company } = req.query;

  // Pull live data from all in-memory stores
  const shipments = Array.from((req.app.locals.shipments || new Map()).values());
  const customers = Array.from((req.app.locals.customers || new Map()).values());
  const complaints = Array.from((req.app.locals.complaints || new Map()).values());
  const payments = Array.from((req.app.locals.payments || new Map()).values());
  const franchises = Array.from((req.app.locals.franchises || new Map()).values());
  const deliveries = Array.from((req.app.locals.deliveries || new Map()).values());
  const inboxMessages = req.app.locals.inboxMessages || [];

  // Apply company filter
  const filter = (arr) =>
    company ? arr.filter((x) => x.company === company.toUpperCase()) : arr;

  const filteredShipments = filter(shipments);
  const filteredComplaints = filter(complaints);
  const filteredPayments = filter(payments);
  const filteredFranchises = filter(franchises);
  const filteredDeliveries = filter(deliveries);
  const filteredMessages = company
    ? inboxMessages.filter((m) => m.company === company.toUpperCase())
    : inboxMessages;

  // ── Shipment stats ────────────────────────────────────────────────────────
  const shipmentsByStatus = {};
  for (const s of filteredShipments) {
    shipmentsByStatus[s.status] = (shipmentsByStatus[s.status] || 0) + 1;
  }

  // ── Complaints stats ──────────────────────────────────────────────────────
  const openComplaints = filteredComplaints.filter((c) => c.status === "abierto");
  const urgentComplaints = openComplaints.filter(
    (c) => c.type === "perdido" || c.type === "dañado"
  );

  // ── Payments stats ────────────────────────────────────────────────────────
  const pendingPayments = filteredPayments.filter((p) => p.status === "pendiente");
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const confirmedAmount = filteredPayments
    .filter((p) => p.status === "confirmado")
    .reduce((sum, p) => sum + p.amount, 0);

  // ── Inbox stats ───────────────────────────────────────────────────────────
  const unreadMessages = filteredMessages.filter((m) => !m.read);
  const messagesByCategory = {};
  for (const m of filteredMessages) {
    messagesByCategory[m.category] = (messagesByCategory[m.category] || 0) + 1;
  }

  // ── Top 5 hot clients (most shipments) ───────────────────────────────────
  const clientShipmentCount = {};
  for (const s of filteredShipments) {
    const key = s.customerPhone;
    clientShipmentCount[key] = (clientShipmentCount[key] || 0) + 1;
  }
  const hotClients = Object.entries(clientShipmentCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phone, count]) => ({ phone, shipmentCount: count }));

  // ── Delivery stats ────────────────────────────────────────────────────────
  const scheduledDeliveries = filteredDeliveries.filter((d) => d.status === "programado");
  const inRouteDeliveries = filteredDeliveries.filter((d) => d.status === "en_ruta");
  const failedDeliveries = filteredDeliveries.filter((d) => d.status === "fallido");

  // ── Franchise pipeline ────────────────────────────────────────────────────
  const franchiseByStatus = {};
  for (const f of filteredFranchises) {
    franchiseByStatus[f.status] = (franchiseByStatus[f.status] || 0) + 1;
  }

  const dashboard = {
    generatedAt: new Date().toISOString(),
    company: company || "ALL",
    companies: company ? [company.toUpperCase()] : Object.keys(COMPANIES),

    inbox: {
      total: filteredMessages.length,
      unread: unreadMessages.length,
      byCategory: messagesByCategory,
      urgent: filteredMessages.filter((m) => getCategoryPriority(m.category) >= 4).length,
    },

    shipments: {
      total: filteredShipments.length,
      byStatus: shipmentsByStatus,
      retained: shipmentsByStatus["RETENIDO"] || 0,
      inTransit: shipmentsByStatus["EN_TRANSITO"] || 0,
      delivered: shipmentsByStatus["ENTREGADO"] || 0,
    },

    complaints: {
      total: filteredComplaints.length,
      open: openComplaints.length,
      urgent: urgentComplaints.length,
      urgentList: urgentComplaints.slice(0, 10).map((c) => ({
        crn: c.crn,
        type: c.type,
        customer: c.customerName,
        created: c.createdAt,
      })),
    },

    payments: {
      pending: pendingPayments.length,
      pendingAmount: parseFloat(pendingAmount.toFixed(2)),
      confirmedAmount: parseFloat(confirmedAmount.toFixed(2)),
    },

    clients: {
      total: filter(customers).length,
      hot: hotClients,
    },

    delivery: {
      scheduled: scheduledDeliveries.length,
      inRoute: inRouteDeliveries.length,
      failed: failedDeliveries.length,
    },

    franchises: {
      total: filteredFranchises.length,
      pipeline: franchiseByStatus,
      active: franchiseByStatus["activo"] || 0,
      prospects: franchiseByStatus["prospecto"] || 0,
    },

    agents: {
      active: agentService.listAgents().filter((a) => a.active).length,
      workload: agentService.getAssignmentStats(),
    },
  };

  res.json(dashboard);
});

// ─── GET /dashboard/health — System health check ─────────────────────────────
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "3.0.0",
    services: {
      whatsapp: !!process.env.WHATSAPP_TOKEN,
      metaAds: !!process.env.META_ADS_TOKEN,
      gmail: !!process.env.GMAIL_USER,
      googleSheets: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      claudeAI: !!process.env.ANTHROPIC_API_KEY,
    },
    companies: Object.keys(COMPANIES),
  });
});

// ─── GET /dashboard/ads — Meta Ads performance ───────────────────────────────
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

module.exports = router;
