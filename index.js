require("dotenv").config();
const express = require("express");
const logger = require("./src/utils/logger");
const db = require("./src/services/db");

const app = express();
app.use(express.json());

// ─── Route modules ────────────────────────────────────────────────────────────
const whatsappWebhook = require("./src/webhook/whatsapp");
const trackingRouter  = require("./src/routes/tracking");
const customersRouter = require("./src/routes/customers");
const invoicesRouter  = require("./src/routes/invoices");
const campaignsRouter = require("./src/routes/campaigns");
const complaintsRouter = require("./src/routes/complaints");
const franchisesRouter = require("./src/routes/franchises");
const paymentsRouter  = require("./src/routes/payments");
const deliveryRouter  = require("./src/routes/delivery");
const inboxRouter     = require("./src/routes/inbox");
const agentsRouter    = require("./src/routes/agents");
const dashboardRouter = require("./src/routes/dashboard");

// ─── Shared stores (in-memory Maps — used when no DATABASE_URL) ───────────────
// Routes export their Maps; dashboard reads them via app.locals
app.locals.inboxMessages = [];
app.locals.shipments     = trackingRouter.shipments;
app.locals.customers     = customersRouter.customers;
app.locals.complaints    = complaintsRouter.complaints;
app.locals.payments      = paymentsRouter.payments;
app.locals.franchises    = franchisesRouter.franchises;
app.locals.deliveries    = deliveryRouter.deliveries;

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use("/webhook",    whatsappWebhook);
app.use("/tracking",   trackingRouter);
app.use("/customers",  customersRouter);
app.use("/invoices",   invoicesRouter);
app.use("/campaigns",  campaignsRouter);
app.use("/complaints", complaintsRouter);
app.use("/franchises", franchisesRouter);
app.use("/payments",   paymentsRouter);
app.use("/delivery",   deliveryRouter);
app.use("/inbox",      inboxRouter);
app.use("/agents",     agentsRouter);
app.use("/dashboard",  dashboardRouter);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Vortex Group — AI Operations System",
    version: "3.0.0",
    companies: ["VTX", "MCP", "GPK", "ONE"],
    database: db.isPostgres() ? "PostgreSQL" : "in-memory",
    routes: [
      "GET/POST /webhook         — WhatsApp Cloud API (multi-brand)",
      "GET/POST /tracking        — Shipment tracking with CRN",
      "GET/POST /customers       — CRM with CRN & tags",
      "GET/POST /invoices        — Invoice generation & delivery",
      "GET/POST /campaigns       — Meta Ads campaigns & leads",
      "GET/POST /complaints      — Quejas y reclamos lifecycle",
      "GET/POST /franchises      — Franchise pipeline management",
      "GET/POST /payments        — Payment tracking & confirmation",
      "GET/POST /delivery        — Delivery scheduling & routes",
      "GET/PATCH /inbox          — Unified inbox aggregator",
      "GET/POST  /agents         — Agent assignment & management",
      "GET       /dashboard      — KPI dashboard (all companies)",
      "GET       /dashboard/health — System health check",
    ],
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  // Init DB (connects to PostgreSQL or stays in-memory)
  await db.init();

  app.listen(PORT, () => {
    logger.info(`Vortex Group AI Operations v3.0 running on port ${PORT}`);
    logger.info(`Database: ${db.isPostgres() ? "PostgreSQL ✓" : "in-memory (set DATABASE_URL to persist)"}`);
    logger.info(`Companies: VTX | MCPack | GoPack | One Courier`);
    logger.info(`Dashboard: GET http://localhost:${PORT}/dashboard`);
    logger.info(`Health:    GET http://localhost:${PORT}/dashboard/health`);
    logger.info(`Webhook:   POST http://localhost:${PORT}/webhook`);
  });
}

start().catch((err) => {
  logger.error("Fatal startup error", { error: err.message });
  process.exit(1);
});
