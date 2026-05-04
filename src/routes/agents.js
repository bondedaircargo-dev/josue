const express = require("express");
const router = express.Router();
const agentService = require("../services/agents");
const logger = require("../utils/logger");

// ─── GET /agents — List all agents ───────────────────────────────────────────
router.get("/", (req, res) => {
  const { active, company } = req.query;
  let list = agentService.listAgents();

  if (active === "true") list = list.filter((a) => a.active);
  if (active === "false") list = list.filter((a) => !a.active);
  if (company) list = list.filter((a) => a.companies.includes(company.toUpperCase()));

  res.json({ total: list.length, agents: list });
});

// ─── GET /agents/stats — Assignment workload ─────────────────────────────────
router.get("/stats", (req, res) => {
  res.json({ agents: agentService.getAssignmentStats() });
});

// ─── GET /agents/:id — Single agent ──────────────────────────────────────────
router.get("/:id", (req, res) => {
  const agent = agentService.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agente no encontrado" });
  res.json(agent);
});

// ─── POST /agents — Create agent ─────────────────────────────────────────────
router.post("/", (req, res) => {
  const { id, name, phone, companies, skills, active } = req.body;
  if (!id || !name) return res.status(400).json({ error: "id y name son requeridos" });

  const agent = agentService.upsertAgent(id, {
    name,
    phone: phone || "",
    companies: companies || ["MCP"],
    skills: skills || ["operacion"],
    active: active !== false,
  });

  logger.info(`Agent created/updated: ${id} — ${name}`);
  res.status(201).json({ success: true, agent });
});

// ─── PATCH /agents/:id — Update agent ────────────────────────────────────────
router.patch("/:id", (req, res) => {
  const agent = agentService.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agente no encontrado" });

  const updated = agentService.upsertAgent(req.params.id, req.body);
  res.json({ success: true, agent: updated });
});

// ─── DELETE /agents/:id — Remove agent ───────────────────────────────────────
router.delete("/:id", (req, res) => {
  const deleted = agentService.deleteAgent(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Agente no encontrado" });
  res.json({ success: true });
});

// ─── POST /agents/assign — Manual assignment ─────────────────────────────────
router.post("/assign", (req, res) => {
  const { conversationKey, company, skill } = req.body;
  if (!conversationKey) return res.status(400).json({ error: "conversationKey es requerido" });

  const agent = agentService.assignAgent(conversationKey, company, skill);
  if (!agent) return res.status(503).json({ error: "No hay agentes disponibles" });

  res.json({ success: true, agent });
});

module.exports = router;
