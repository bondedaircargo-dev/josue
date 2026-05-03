require("dotenv").config();
const express = require("express");
const logger = require("./src/utils/logger");

const app = express();
app.use(express.json());

// Routes
const whatsappWebhook = require("./src/webhook/whatsapp");
const trackingRouter = require("./src/routes/tracking");
const customersRouter = require("./src/routes/customers");
const invoicesRouter = require("./src/routes/invoices");
const campaignsRouter = require("./src/routes/campaigns");
const reportsRouter = require("./src/routes/reports");

app.use("/webhook", whatsappWebhook);
app.use("/tracking", trackingRouter);
app.use("/customers", customersRouter);
app.use("/invoices", invoicesRouter);
app.use("/campaigns", campaignsRouter);
app.use("/reports", reportsRouter);

// Root health check
app.get("/", (req, res) => {
  res.json({
    name: "Bonded Air Cargo Automation API",
    version: "2.0.0",
    status: "running",
    routes: [
      "GET/POST /webhook        - WhatsApp Cloud API webhook",
      "GET/POST /tracking       - AWB tracking management",
      "GET/POST /customers      - CRM / customer management",
      "GET/POST /invoices       - Invoice generation & delivery",
      "GET/POST /campaigns      - Meta Ads campaigns & leads",
      "GET      /reports/health - System health check",
      "GET      /reports/awb    - AWB report PDF",
      "GET      /reports/ads    - Meta Ads report",
    ],
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Bonded Air Cargo Automation running on port ${PORT}`);
  logger.info(`WhatsApp webhook: POST http://localhost:${PORT}/webhook`);
  logger.info(`Health check:     GET  http://localhost:${PORT}/reports/health`);
});
