const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const { getSmartReply, detectClientType, CLIENT_TYPES } = require("../services/claude");
const { sanitizeText } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory conversation history — replace with Redis in production
const conversationHistory = new Map();

// ─── GET /webhook — Meta verification handshake ───────────────────────────────
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    logger.info("Webhook verified by Meta ✓");
    return res.status(200).send(challenge);
  }

  logger.warn("Webhook verification failed — token mismatch");
  res.sendStatus(403);
});

// ─── POST /webhook — Receive messages ────────────────────────────────────────
router.post("/", async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== "whatsapp_business_account") return;

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];

  if (!message) return;

  const from = message.from;
  const messageId = message.id;
  const msgType = message.type;
  const customerName = contact?.profile?.name || "Cliente";

  logger.info(`[${from}] ${customerName}: type=${msgType}`);

  // Mark message as read
  try { await wa.markAsRead(messageId); } catch (_) {}

  // Extract text
  let incomingText = "";
  if (msgType === "text") {
    incomingText = message.text.body;
  } else if (msgType === "interactive") {
    incomingText =
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      "";
  } else {
    await wa.sendText(
      from,
      `Hola ${customerName}! Por ahora solo proceso mensajes de texto. ¿En qué puedo ayudarte?`
    );
    return;
  }

  const lower = sanitizeText(incomingText);

  // ── Step 1: Quick keyword shortcuts (no API call, instant) ──────────────
  const quick = getQuickReply(lower, customerName);
  if (quick) {
    try { await wa.sendText(from, quick); } catch (err) {
      logger.error("sendText error", { error: err.message });
    }
    return;
  }

  // ── Step 2: Claude AI with client-type routing ───────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    await wa.sendText(from, templates.defaultReply(customerName));
    return;
  }

  const history = conversationHistory.get(from) || [];
  history.push({ role: "user", content: incomingText });

  try {
    const { reply, clientType } = await getSmartReply(incomingText, history);

    history.push({ role: "assistant", content: reply });
    if (history.length > 20) history.splice(0, history.length - 20);
    conversationHistory.set(from, history);

    logger.info(`[${from}] Claude → type:${clientType}`);
    await wa.sendText(from, reply);
  } catch (err) {
    logger.error("Claude API error", { error: err.message });
    await wa.sendText(from, templates.defaultReply(customerName));
  }
});

// ─── Quick keyword replies (bypass Claude for common intents) ─────────────────
function getQuickReply(lower, name) {
  // Menu triggers
  if (
    lower === "hola" || lower === "hello" || lower === "hi" ||
    lower === "bonswa" || lower === "buenos dias" || lower === "buenas" ||
    lower === "buenos días" || lower === "menu" || lower === "menú" ||
    lower === "start" || lower === "inicio"
  ) {
    return templates.welcome(name);
  }

  // Shortcut number buttons
  if (lower === "1") return templates.askForAWB(name);
  if (lower === "2") return templates.pricingInfo();
  if (lower === "3") return templates.deliveryTime();
  if (lower === "4") return templates.pickupInfo();

  // Human agent
  if (
    lower.includes("agente") || lower.includes("humano") ||
    lower.includes("persona") || lower.includes("hablar con")
  ) {
    return templates.transferToAgent(name);
  }

  // Thank you
  if (lower.includes("gracias") || lower.includes("mèsi") || lower.includes("thank")) {
    return templates.thankYou(name);
  }

  return null;
}

module.exports = router;
