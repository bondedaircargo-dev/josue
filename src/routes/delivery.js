const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const { getCompanyById } = require("../config/companies");
const { generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");

// In-memory store — replace with DB in production
const deliveries = new Map();
const routes = new Map();

const DELIVERY_STATUSES = [
  "programado",
  "en_ruta",
  "entregado",
  "fallido",
  "reagendado",
  "devuelto",
];

// ─── DELIVERIES ───────────────────────────────────────────────────────────────

// GET /delivery — List deliveries
router.get("/", (req, res) => {
  const { status, company, routeId, date } = req.query;
  let list = Array.from(deliveries.values());

  if (status) list = list.filter((d) => d.status === status);
  if (company) list = list.filter((d) => d.company === company.toUpperCase());
  if (routeId) list = list.filter((d) => d.routeId === routeId);
  if (date) list = list.filter((d) => d.scheduledDate?.startsWith(date));

  list.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  res.json({ total: list.length, deliveries: list });
});

// GET /delivery/:crn — Single delivery
router.get("/:crn", (req, res) => {
  const d = deliveries.get(req.params.crn.toUpperCase());
  if (!d) return res.status(404).json({ error: "Entrega no encontrada" });
  res.json(d);
});

// POST /delivery — Schedule a delivery
router.post("/", async (req, res) => {
  const {
    shipmentCrn,
    customerName,
    customerPhone,
    deliveryAddress,
    city,
    zone,
    scheduledDate,
    driverName,
    driverPhone,
    routeId,
    company: companyId,
    notes,
  } = req.body;

  if (!customerPhone || !deliveryAddress || !scheduledDate) {
    return res.status(400).json({
      error: "customerPhone, deliveryAddress y scheduledDate son requeridos",
    });
  }

  const company = getCompanyById(companyId);
  const crn = generateCRN(company.id, "DEL");

  const delivery = {
    crn,
    company: company.id,
    shipmentCrn: shipmentCrn || null,
    customerName: customerName || "Cliente",
    customerPhone,
    deliveryAddress,
    city: city || null,
    zone: zone || null,
    scheduledDate,
    driverName: driverName || null,
    driverPhone: driverPhone || null,
    routeId: routeId || null,
    status: "programado",
    proofOfDelivery: null,
    failureReason: null,
    statusHistory: [
      { status: "programado", date: new Date().toISOString(), note: "Entrega programada" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  deliveries.set(crn, delivery);
  logger.info(`Delivery scheduled: ${crn} for ${scheduledDate}`);

  // Notify customer
  try {
    await wa.sendText(
      customerPhone,
      `📦 *${company.fullName} — Entrega Programada*\n\nHola ${customerName},\n\nTu entrega fue programada:\n\n🔖 *Ref:* ${crn}\n📅 *Fecha:* ${scheduledDate}\n📍 *Dirección:* ${deliveryAddress}\n\nTe notificaremos cuando el repartidor esté en camino.`,
      company
    );
  } catch (err) {
    logger.warn("Delivery schedule WA failed", { error: err.message });
  }

  res.status(201).json({ success: true, crn, delivery });
});

// PATCH /delivery/:crn/status — Update delivery status
router.patch("/:crn/status", async (req, res) => {
  const delivery = deliveries.get(req.params.crn.toUpperCase());
  if (!delivery) return res.status(404).json({ error: "Entrega no encontrada" });

  const { status, note, proofUrl, failureReason } = req.body;
  if (!DELIVERY_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Estados válidos: ${DELIVERY_STATUSES.join(", ")}`,
    });
  }

  delivery.status = status;
  if (proofUrl) delivery.proofOfDelivery = { url: proofUrl, capturedAt: new Date().toISOString() };
  if (failureReason) delivery.failureReason = failureReason;
  delivery.statusHistory.push({ status, date: new Date().toISOString(), note: note || "" });
  delivery.updatedAt = new Date().toISOString();
  deliveries.set(delivery.crn, delivery);

  logger.info(`Delivery ${delivery.crn} → ${status}`);

  const company = getCompanyById(delivery.company);

  if (status === "en_ruta") {
    try {
      await wa.sendText(
        delivery.customerPhone,
        `🚐 *${company.fullName} — En Camino*\n\nHola ${delivery.customerName},\n\nNuestro repartidor está en camino a entregar tu paquete.\n\n🔖 *Ref:* ${delivery.crn}\n📍 *Dirección:* ${delivery.deliveryAddress}\n\nEsperamos estar ahí pronto. Por favor ten disponible tu identificación.`,
        company
      );
    } catch (err) {
      logger.warn("Delivery en_ruta WA failed", { error: err.message });
    }
  }

  if (status === "entregado") {
    try {
      await wa.sendText(
        delivery.customerPhone,
        `✅ *${company.fullName} — Entregado*\n\nHola ${delivery.customerName},\n\nTu paquete fue entregado exitosamente.\n\n🔖 *Ref:* ${delivery.crn}\n\nGracias por confiar en ${company.fullName}. ¡Hasta la próxima!`,
        company
      );
    } catch (err) {
      logger.warn("Delivery entregado WA failed", { error: err.message });
    }
  }

  if (status === "fallido") {
    try {
      await wa.sendText(
        delivery.customerPhone,
        `⚠️ *${company.fullName} — Entrega Fallida*\n\nHola ${delivery.customerName},\n\nNo pudimos entregar tu paquete hoy.\n\n🔖 *Ref:* ${delivery.crn}\n${failureReason ? `Motivo: ${failureReason}` : ""}\n\nEscríbenos para reprogramar tu entrega.`,
        company
      );
    } catch (err) {
      logger.warn("Delivery fallido WA failed", { error: err.message });
    }
  }

  res.json({ success: true, delivery });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// GET /delivery/routes/list — List all routes
router.get("/routes/list", (req, res) => {
  const { date, company } = req.query;
  let list = Array.from(routes.values());

  if (date) list = list.filter((r) => r.date === date);
  if (company) list = list.filter((r) => r.company === company.toUpperCase());

  res.json({ total: list.length, routes: list });
});

// POST /delivery/routes — Create a delivery route
router.post("/routes", (req, res) => {
  const { date, driverName, driverPhone, zone, deliveryCrns, company: companyId } = req.body;

  if (!date || !driverName) {
    return res.status(400).json({ error: "date y driverName son requeridos" });
  }

  const company = getCompanyById(companyId);
  const routeId = generateCRN(company.id, "RTE");

  const route = {
    routeId,
    company: company.id,
    date,
    driverName,
    driverPhone: driverPhone || null,
    zone: zone || null,
    deliveryCrns: deliveryCrns || [],
    status: "pendiente",
    createdAt: new Date().toISOString(),
  };

  routes.set(routeId, route);

  // Link deliveries to this route
  for (const crn of route.deliveryCrns) {
    const d = deliveries.get(crn.toUpperCase());
    if (d) {
      d.routeId = routeId;
      d.driverName = driverName;
      d.driverPhone = driverPhone || null;
      deliveries.set(d.crn, d);
    }
  }

  logger.info(`Route created: ${routeId} — ${driverName} (${date})`);
  res.status(201).json({ success: true, routeId, route });
});

module.exports = router;
module.exports.deliveries = deliveries;
module.exports.routes = routes;
