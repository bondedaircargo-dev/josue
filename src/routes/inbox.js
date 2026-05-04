const express = require("express");
const router = express.Router();
const { getCategoryPriority } = require("../services/classifier");
const logger = require("../utils/logger");

// ─── GET /inbox — Unified daily inbox ────────────────────────────────────────
// Aggregates messages from all sources, sorted by priority + time
// The inboxMessages array is populated by the WhatsApp webhook handler

router.get("/", (req, res) => {
  const { company, unread, category, limit } = req.query;
  let messages = req.app.locals.inboxMessages || [];

  if (company) messages = messages.filter((m) => m.company === company.toUpperCase());
  if (unread === "true") messages = messages.filter((m) => !m.read);
  if (category) messages = messages.filter((m) => m.category === category);

  // Sort: priority desc, then timestamp desc
  messages = [...messages].sort((a, b) => {
    const pa = getCategoryPriority(a.category);
    const pb = getCategoryPriority(b.category);
    if (pa !== pb) return pb - pa;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  if (limit) messages = messages.slice(0, parseInt(limit));

  const unreadCount = (req.app.locals.inboxMessages || []).filter((m) => !m.read).length;

  res.json({
    total: messages.length,
    unread: unreadCount,
    messages,
  });
});

// ─── GET /inbox/summary — Count by category ──────────────────────────────────
router.get("/summary", (req, res) => {
  const { company } = req.query;
  let messages = req.app.locals.inboxMessages || [];

  if (company) messages = messages.filter((m) => m.company === company.toUpperCase());

  const summary = {};
  for (const msg of messages) {
    summary[msg.category] = (summary[msg.category] || 0) + 1;
  }

  res.json({
    total: messages.length,
    unread: messages.filter((m) => !m.read).length,
    byCategory: summary,
  });
});

// ─── PATCH /inbox/:id/read — Mark message as read ────────────────────────────
router.patch("/:id/read", (req, res) => {
  const messages = req.app.locals.inboxMessages || [];
  const msg = messages.find((m) => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: "Mensaje no encontrado" });

  msg.read = true;
  msg.readAt = new Date().toISOString();
  logger.info(`Message ${req.params.id} marked as read`);
  res.json({ success: true });
});

// ─── PATCH /inbox/:id/assign — Assign message to agent ──────────────────────
router.patch("/:id/assign", (req, res) => {
  const messages = req.app.locals.inboxMessages || [];
  const msg = messages.find((m) => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: "Mensaje no encontrado" });

  const { agentId, agentName } = req.body;
  msg.assignedAgent = { id: agentId, name: agentName, assignedAt: new Date().toISOString() };
  res.json({ success: true, message: msg });
});

// ─── DELETE /inbox/clear — Clear read messages (maintenance) ─────────────────
router.delete("/clear", (req, res) => {
  const before = (req.app.locals.inboxMessages || []).length;
  req.app.locals.inboxMessages = (req.app.locals.inboxMessages || []).filter((m) => !m.read);
  const after = req.app.locals.inboxMessages.length;
  res.json({ success: true, removed: before - after, remaining: after });
});

module.exports = router;
