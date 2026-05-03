const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const claude = require("../services/claude");
const { sanitizeText } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory conversation history (replace with Redis/DB in production)
const conversationHistory = new Map();

// GET - Meta webhook verification
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified by Meta");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST - Receive messages
router.post("/", async (req, res) => {
  // Always respond 200 fast so Meta doesn't retry
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

  logger.info(`Message received from ${from} (${customerName}): type=${msgType}`);

  // Mark as read
  try {
    await wa.markAsRead(messageId);
  } catch (_) {}

  let incomingText = "";
  if (msgType === "text") {
    incomingText = message.text.body;
  } else if (msgType === "interactive") {
    incomingText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
  } else {
    await wa.sendText(from, `Hola ${customerName}! Recibimos tu ${msgType}. Por el momento solo procesamos mensajes de texto. ¿En qué podemos ayudarte?`);
    return;
  }

  const lower = sanitizeText(incomingText);

  // Route by keyword first (fast path), fallback to Claude AI
  const quickReply = getQuickReply(lower, customerName, from);

  if (quickReply) {
    try {
      await wa.sendText(from, quickReply);
    } catch (err) {
      logger.error("Error sending quick reply", { error: err.message });
    }
    return;
  }

  // Claude AI smart reply
  if (process.env.ANTHROPIC_API_KEY) {
    const history = conversationHistory.get(from) || [];
    history.push({ role: "user", content: incomingText });

    try {
      const reply = await claude.getSmartReply(incomingText, history);
      history.push({ role: "assistant", content: reply });
      // Keep last 10 turns
      if (history.length > 20) history.splice(0, history.length - 20);
      conversationHistory.set(from, history);
      await wa.sendText(from, reply);
    } catch (err) {
      logger.error("Claude API error", { error: err.message });
      await wa.sendText(from, templates.defaultReply(customerName));
    }
  } else {
    await wa.sendText(from, templates.defaultReply(customerName));
  }
});

function getQuickReply(lower, name, phone) {
  if (lower === "1" || lower.includes("rastrear") || lower.includes("tracking") || lower.includes("donde esta") || lower.includes("dónde está")) {
    return templates.askForAWB(name);
  }
  if (lower === "2" || lower.includes("precio") || lower.includes("tarifa") || lower.includes("costo") || lower.includes("cuanto cuesta") || lower.includes("cuánto cuesta")) {
    return templates.pricingInfo();
  }
  if (lower === "3" || lower.includes("tiempo") || lower.includes("cuanto tarda") || lower.includes("cuándo llega") || lower.includes("cuando llega")) {
    return templates.deliveryTime();
  }
  if (lower === "4" || lower.includes("recoleccion") || lower.includes("recolección") || lower.includes("pickup") || lower.includes("buscar")) {
    return templates.pickupInfo();
  }
  if (lower.includes("hola") || lower.includes("hello") || lower.includes("bonswa") || lower.includes("buenos dias") || lower.includes("buenas")) {
    return templates.welcome(name);
  }
  if (lower.includes("gracias") || lower.includes("mèsi") || lower.includes("thank")) {
    return templates.thankYou(name);
  }
  if (lower.includes("hablar con") || lower.includes("agente") || lower.includes("humano") || lower.includes("persona")) {
    return templates.transferToAgent(name);
  }
  return null;
}

module.exports = router;
