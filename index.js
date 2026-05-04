require("dotenv").config();
const express = require("express");
const logger = require("./src/utils/logger");

const app = express();
app.use(express.json());

// ─── Route modules ────────────────────────────────────────────────────────────
const whatsappWebhook = require("./src/webhook/whatsapp");
const trackingRouter = require("./src/routes/tracking");
const customersRouter = require("./src/routes/customers");
const invoicesRouter = require("./src/routes/invoices");
const campaignsRouter = require("./src/routes/campaigns");
const complaintsRouter = require("./src/routes/complaints");
const franchisesRouter = require("./src/routes/franchises");
const paymentsRouter = require("./src/routes/payments");
const deliveryRouter = require("./src/routes/delivery");
const inboxRouter = require("./src/routes/inbox");
const agentsRouter = require("./src/routes/agents");
const dashboardRouter = require("./src/routes/dashboard");

// ─── Shared in-memory stores (expose to dashboard & inbox via app.locals) ─────
// In production, replace these with a real DB (Supabase / PostgreSQL)
app.locals.inboxMessages = [];
app.locals.shipments = trackingRouter.shipments;
app.locals.customers = customersRouter.customers;
app.locals.complaints = complaintsRouter.complaints;
app.locals.payments = paymentsRouter.payments;
app.locals.franchises = franchisesRouter.franchises;
app.locals.deliveries = deliveryRouter.deliveries;

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use("/webhook", whatsappWebhook);
app.use("/tracking", trackingRouter);
app.use("/customers", customersRouter);
app.use("/invoices", invoicesRouter);
app.use("/campaigns", campaignsRouter);
app.use("/complaints", complaintsRouter);
app.use("/franchises", franchisesRouter);
app.use("/payments", paymentsRouter);
app.use("/delivery", deliveryRouter);
app.use("/inbox", inboxRouter);
app.use("/agents", agentsRouter);
app.use("/dashboard", dashboardRouter);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Vortex Group — AI Operations System",
    version: "3.0.0",
    companies: ["VTX", "MCP", "GPK", "ONE"],
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

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Vortex Group AI Operations running on port ${PORT}`);
  logger.info(`Companies: VTX | MCPack | GoPack | One Courier`);
  logger.info(`Dashboard: GET http://localhost:${PORT}/dashboard`);
  logger.info(`Health:    GET http://localhost:${PORT}/dashboard/health`);
  logger.info(`Webhook:   POST http://localhost:${PORT}/webhook`);
});
