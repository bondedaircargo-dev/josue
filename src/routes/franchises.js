const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const gmail = require("../services/gmail");
const { getCompanyById } = require("../config/companies");
const { generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory store — replace with DB in production
const franchises = new Map();

const FRANCHISE_STATUSES = [
  "prospecto",
  "en_evaluacion",
  "aprobado",
  "en_entrenamiento",
  "activo",
  "inactivo",
  "rechazado",
];

// ─── GET /franchises — List with filters ─────────────────────────────────────
router.get("/", (req, res) => {
  const { status, company } = req.query;
  let list = Array.from(franchises.values());

  if (status) list = list.filter((f) => f.status === status);
  if (company) list = list.filter((f) => f.company === company.toUpperCase());

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ total: list.length, franchises: list });
});

// ─── GET /franchises/:crn — Single franchise ─────────────────────────────────
router.get("/:crn", (req, res) => {
  const f = franchises.get(req.params.crn.toUpperCase());
  if (!f) return res.status(404).json({ error: "Franquicia no encontrada" });
  res.json(f);
});

// ─── POST /franchises — Register franchise prospect ──────────────────────────
router.post("/", async (req, res) => {
  const {
    ownerName,
    ownerPhone,
    ownerEmail,
    city,
    country,
    hasLocation,
    experience,
    investmentCapacity,
    company: companyId,
    notes,
  } = req.body;

  if (!ownerName || !ownerPhone || !city) {
    return res.status(400).json({ error: "ownerName, ownerPhone y city son requeridos" });
  }

  const company = getCompanyById(companyId);
  const crn = generateCRN(company.id, "FRAN");

  const franchise = {
    crn,
    company: company.id,
    ownerName,
    ownerPhone,
    ownerEmail: ownerEmail || null,
    city,
    country: (country || "DO").toUpperCase(),
    hasLocation: hasLocation || false,
    experience: experience || null,
    investmentCapacity: parseFloat(investmentCapacity) || 0,
    status: "prospecto",
    assignedTo: null,
    notes: notes || null,
    statusHistory: [
      { status: "prospecto", date: new Date().toISOString(), note: "Interés registrado" },
    ],
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  franchises.set(crn, franchise);
  logger.info(`Franchise prospect: ${crn} — ${ownerName} (${city})`);

  // WhatsApp confirmation
  try {
    await wa.sendText(
      ownerPhone,
      `🤝 *${company.fullName} — Franquicia*\n\nHola ${ownerName}! Hemos recibido tu interés en ser agente autorizado.\n\n🔖 *Ref:* ${crn}\n📍 *Ciudad:* ${city}\n\nUn asesor te contactará en 24-48 horas para los próximos pasos.`,
      company
    );
  } catch (err) {
    logger.warn("Franchise WA notification failed", { error: err.message });
  }

  // Email if available
  if (ownerEmail) {
    try {
      await gmail.sendEmail({
        to: ownerEmail,
        subject: `Solicitud de Franquicia ${company.fullName} — ${crn}`,
        html: `<p>Hola <strong>${ownerName}</strong>,</p>
<p>Recibimos tu solicitud para ser agente autorizado de <strong>${company.fullName}</strong>.</p>
<p><strong>Referencia:</strong> ${crn}</p>
<p>Un asesor se pondrá en contacto contigo en las próximas 24-48 horas hábiles.</p>
<p>Gracias por tu interés.</p>`,
      });
    } catch (err) {
      logger.warn("Franchise email failed", { error: err.message });
    }
  }

  res.status(201).json({ success: true, crn, franchise });
});

// ─── PATCH /franchises/:crn/status — Update status ───────────────────────────
router.patch("/:crn/status", async (req, res) => {
  const f = franchises.get(req.params.crn.toUpperCase());
  if (!f) return res.status(404).json({ error: "Franquicia no encontrada" });

  const { status, note } = req.body;
  if (!FRANCHISE_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Estados válidos: ${FRANCHISE_STATUSES.join(", ")}`,
    });
  }

  f.status = status;
  f.statusHistory.push({ status, date: new Date().toISOString(), note: note || "" });
  f.updatedAt = new Date().toISOString();
  franchises.set(f.crn, f);

  const company = getCompanyById(f.company);

  if (status === "aprobado" || status === "activo") {
    try {
      await wa.sendText(
        f.ownerPhone,
        `✅ *${company.fullName} — Franquicia Aprobada*\n\nHola ${f.ownerName},\n\nTu solicitud *${f.crn}* fue *${status.toUpperCase()}*.\n\n${note ? `Nota: ${note}` : "Pronto recibirás instrucciones para los próximos pasos."}\n\n¡Bienvenido/a al equipo!`,
        company
      );
    } catch (err) {
      logger.warn("Franchise status WA failed", { error: err.message });
    }
  }

  res.json({ success: true, franchise: f });
});

// ─── PATCH /franchises/:crn/assign — Assign advisor ─────────────────────────
router.patch("/:crn/assign", (req, res) => {
  const f = franchises.get(req.params.crn.toUpperCase());
  if (!f) return res.status(404).json({ error: "Franquicia no encontrada" });

  const { agentId, agentName } = req.body;
  f.assignedTo = { id: agentId, name: agentName };
  f.updatedAt = new Date().toISOString();
  franchises.set(f.crn, f);
  res.json({ success: true, franchise: f });
});

module.exports = router;
module.exports.franchises = franchises;
