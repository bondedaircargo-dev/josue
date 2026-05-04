const express = require("express");
const router = express.Router();
const wa = require("../services/whatsapp");
const { getSmartReply } = require("../services/claude");
const { classifyMessage, detectLanguage, CATEGORIES } = require("../services/classifier");
const { assignAgent } = require("../services/agents");
const { getCompanyByPhoneId } = require("../config/companies");
const { sanitizeText, generateCRN } = require("../utils/helpers");
const logger = require("../utils/logger");
const templates = require("../templates/messages");

// In-memory conversation history — replace with Redis in production
const conversationHistory = new Map();
// Track escalated conversations to avoid double-routing
const escalated = new Set();

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
  // Always 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== "whatsapp_business_account") return;

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];
  const phoneNumberId = value?.metadata?.phone_number_id;

  if (!message) return;

  // Resolve which brand/company this message came in on
  const company = getCompanyByPhoneId(phoneNumberId);

  const from = message.from;
  const messageId = message.id;
  const msgType = message.type;
  const customerName = contact?.profile?.name || "Cliente";
  const conversationKey = `${from}:${company.id}`;

  logger.info(`[${company.id}][${from}] ${customerName}: type=${msgType}`);

  // Mark as read
  try {
    await wa.markAsReadForCompany(messageId, company);
  } catch (_) {}

  // ── Extract text ─────────────────────────────────────────────────────────
  let incomingText = "";
  if (msgType === "text") {
    incomingText = message.text.body;
  } else if (msgType === "interactive") {
    incomingText =
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      "";
  } else if (msgType === "image" || msgType === "document") {
    // Acknowledge media and ask for context
    await wa.sendTextForCompany(
      from,
      `Hola ${customerName}! Recibí tu ${msgType === "image" ? "imagen" : "documento"}. ¿Puedes decirme a qué envío corresponde? Comparte tu CRN o número de AWB.`,
      company
    );
    return;
  } else {
    await wa.sendTextForCompany(
      from,
      `Hola ${customerName}! Por ahora solo proceso mensajes de texto. ¿En qué puedo ayudarte?`,
      company
    );
    return;
  }

  const lower = sanitizeText(incomingText);
  const lang = detectLanguage(incomingText);
  const category = classifyMessage(incomingText);

  logger.info(`[${company.id}][${from}] lang=${lang} category=${category}`);

  // Log message to app-level inbox store
  if (req.app.locals.inboxMessages) {
    req.app.locals.inboxMessages.push({
      id: messageId,
      from,
      customerName,
      company: company.id,
      text: incomingText,
      lang,
      category,
      read: false,
      assignedAgent: null,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Step 1: Quick keyword shortcuts (no API call, instant) ──────────────
  const quick = getQuickReply(lower, customerName, company, lang);
  if (quick) {
    try {
      await wa.sendTextForCompany(from, quick, company);
    } catch (err) {
      logger.error("sendText error", { error: err.message });
    }
    return;
  }

  // ── Step 2: Escalate to human if AGENTE category or already escalated ────
  if (category === CATEGORIES.AGENTE) {
    escalated.add(conversationKey);
    const agent = assignAgent(conversationKey, company.id);
    const agentName = agent?.name || "un agente";
    await wa.sendTextForCompany(
      from,
      templates.transferToAgent(customerName, company, agentName),
      company
    );
    return;
  }

  // ── Step 3: Claude AI with category routing ──────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    await wa.sendTextForCompany(from, templates.defaultReply(customerName, company), company);
    return;
  }

  const history = conversationHistory.get(conversationKey) || [];
  history.push({ role: "user", content: incomingText });

  try {
    const { reply } = await getSmartReply(incomingText, history, category, company);

    history.push({ role: "assistant", content: reply });
    if (history.length > 20) history.splice(0, history.length - 20);
    conversationHistory.set(conversationKey, history);

    await wa.sendTextForCompany(from, reply, company);
  } catch (err) {
    logger.error("Claude API error", { error: err.message });
    await wa.sendTextForCompany(from, templates.defaultReply(customerName, company), company);
  }
});

// ─── Quick keyword replies (bypass Claude for instant responses) ──────────────
function getQuickReply(lower, name, company, lang) {
  const greetings = [
    "hola", "hello", "hi", "bonswa", "bonjou", "buenos dias", "buenas",
    "buenos días", "buenas tardes", "buenas noches", "menu", "menú", "start", "inicio",
  ];

  if (greetings.includes(lower) || lower === "1" && lower.length === 1) {
    return templates.welcome(name, company, lang);
  }

  if (lower === "1") return templates.askForAWB(name, company);
  if (lower === "2") return templates.pricingInfo(company, lang);
  if (lower === "3") return templates.deliveryTime(lang);
  if (lower === "4") return templates.pickupInfo(company, lang);

  if (lower.includes("gracias") || lower.includes("mèsi") || lower.includes("thank")) {
    return templates.thankYou(name, company);
  }

  return null;
}

module.exports = router;
