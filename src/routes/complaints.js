const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const { getCompanyById } = require("../config/companies");
const { generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory store — replace with DB in production
const complaints = new Map();

const COMPLAINT_TYPES = [
  "perdido",
  "dañado",
  "retraso",
  "cobro_incorrecto",
  "entrega_fallida",
  "otro",
];

const COMPLAINT_STATUSES = ["abierto", "en_revision", "resuelto", "cerrado"];

// ─── GET /complaints — List with filters ─────────────────────────────────────
router.get("/", (req, res) => {
  const { status, type, company, urgent } = req.query;
  let list = Array.from(complaints.values());

  if (status) list = list.filter((c) => c.status === status);
  if (type) list = list.filter((c) => c.type === type);
  if (company) list = list.filter((c) => c.company === company.toUpperCase());
  if (urgent === "true")
    list = list.filter((c) => c.type === "perdido" || c.type === "dañado");

  // Sort: open + recent first
  list.sort((a, b) => {
    if (a.status === "abierto" && b.status !== "abierto") return -1;
    if (b.status === "abierto" && a.status !== "abierto") return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({ total: list.length, complaints: list });
});

// ─── GET /complaints/:crn — Single complaint ─────────────────────────────────
router.get("/:crn", (req, res) => {
  const complaint = complaints.get(req.params.crn.toUpperCase());
  if (!complaint) return res.status(404).json({ error: "Reclamo no encontrado" });
  res.json(complaint);
});

// ─── POST /complaints — Create complaint ─────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    customerName,
    customerPhone,
    awb,
    type,
    description,
    amount,
    evidence,
    company: companyId,
  } = req.body;

  if (!customerName || !customerPhone || !type) {
    return res.status(400).json({
      error: "customerName, customerPhone y type son requeridos",
    });
  }
  if (!COMPLAINT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipos válidos: ${COMPLAINT_TYPES.join(", ")}` });
  }

  const company = getCompanyById(companyId);
  const crn = generateCRN(company.id, "CLAIM");

  const complaint = {
    crn,
    company: company.id,
    customerName,
    customerPhone,
    awb: awb || null,
    type,
    description: description || null,
    amount: parseFloat(amount) || 0,
    evidence: evidence || [],
    status: "abierto",
    assignedTo: null,
    resolution: null,
    statusHistory: [
      { status: "abierto", date: new Date().toISOString(), note: "Reclamo creado" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  complaints.set(crn, complaint);
  logger.info(`Complaint created: ${crn} (${type}) for ${company.id}`);

  // Notify customer
  try {
    await wa.sendText(
      customerPhone,
      templates.complaintReceived(customerName, crn, company),
      company
    );
  } catch (err) {
    logger.warn("Complaint WA notification failed", { error: err.message });
  }

  res.status(201).json({ success: true, crn, complaint });
});

// ─── PATCH /complaints/:crn/status — Update status ───────────────────────────
router.patch("/:crn/status", async (req, res) => {
  const complaint = complaints.get(req.params.crn.toUpperCase());
  if (!complaint) return res.status(404).json({ error: "Reclamo no encontrado" });

  const { status, note, resolution } = req.body;
  if (!COMPLAINT_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Estados válidos: ${COMPLAINT_STATUSES.join(", ")}`,
    });
  }

  complaint.status = status;
  if (resolution) complaint.resolution = resolution;
  complaint.statusHistory.push({
    status,
    date: new Date().toISOString(),
    note: note || "",
  });
  complaint.updatedAt = new Date().toISOString();
  complaints.set(complaint.crn, complaint);

  const company = getCompanyById(complaint.company);

  if (status === "resuelto" || status === "cerrado") {
    try {
      await wa.sendText(
        complaint.customerPhone,
        templates.complaintResolved(complaint.customerName, complaint.crn, resolution, company),
        company
      );
    } catch (err) {
      logger.warn("Complaint resolution WA failed", { error: err.message });
    }
  }

  res.json({ success: true, complaint });
});

// ─── PATCH /complaints/:crn/assign — Assign to agent ────────────────────────
router.patch("/:crn/assign", (req, res) => {
  const complaint = complaints.get(req.params.crn.toUpperCase());
  if (!complaint) return res.status(404).json({ error: "Reclamo no encontrado" });

  const { agentId, agentName } = req.body;
  complaint.assignedTo = { id: agentId, name: agentName };
  complaint.updatedAt = new Date().toISOString();
  complaints.set(complaint.crn, complaint);
  res.json({ success: true, complaint });
});

// ─── POST /complaints/:crn/evidence — Add evidence (photo/doc URL) ───────────
router.post("/:crn/evidence", (req, res) => {
  const complaint = complaints.get(req.params.crn.toUpperCase());
  if (!complaint) return res.status(404).json({ error: "Reclamo no encontrado" });

  const { url, type, description } = req.body;
  if (!url) return res.status(400).json({ error: "url es requerido" });

  complaint.evidence.push({
    url,
    type: type || "document",
    description: description || null,
    addedAt: new Date().toISOString(),
  });
  complaint.updatedAt = new Date().toISOString();
  complaints.set(complaint.crn, complaint);

  res.json({ success: true, evidenceCount: complaint.evidence.length });
});

module.exports = router;
module.exports.complaints = complaints;
