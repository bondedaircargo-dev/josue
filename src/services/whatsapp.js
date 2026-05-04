const axios = require("axios");
const logger = require("../utils/logger");

const BASE_URL = "https://graph.facebook.com/v19.0";

// ─── Per-company helpers ──────────────────────────────────────────────────────

function getConfig(company = null) {
  return {
    token: company?.waToken || process.env.WHATSAPP_TOKEN,
    phoneId: company?.phoneNumberId || process.env.PHONE_NUMBER_ID,
  };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Core send functions (with optional company context) ─────────────────────

async function sendText(to, body, company = null) {
  const { token, phoneId } = getConfig(company);
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  const res = await axios.post(url, payload, { headers: headers(token) });
  logger.info(`[${company?.id || "default"}] Text sent to ${to}`);
  return res.data;
}

// Alias used in webhook for clarity
const sendTextForCompany = sendText;

async function sendTemplate(to, templateName, langCode = "es", components = [], company = null) {
  const { token, phoneId } = getConfig(company);
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name: templateName, language: { code: langCode }, components },
  };
  const res = await axios.post(url, payload, { headers: headers(token) });
  logger.info(`[${company?.id || "default"}] Template "${templateName}" sent to ${to}`);
  return res.data;
}

async function sendInteractive(to, body, buttons, company = null) {
  const { token, phoneId } = getConfig(company);
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((btn, i) => ({
          type: "reply",
          reply: { id: `btn_${i}`, title: btn },
        })),
      },
    },
  };
  const res = await axios.post(url, payload, { headers: headers(token) });
  logger.info(`[${company?.id || "default"}] Interactive sent to ${to}`);
  return res.data;
}

async function sendDocument(to, documentUrl, caption, filename, company = null) {
  const { token, phoneId } = getConfig(company);
  const url = `${BASE_URL}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: { link: documentUrl, caption, filename },
  };
  const res = await axios.post(url, payload, { headers: headers(token) });
  logger.info(`[${company?.id || "default"}] Document sent to ${to}: ${filename}`);
  return res.data;
}

async function markAsRead(messageId, company = null) {
  const { token, phoneId } = getConfig(company);
  const url = `${BASE_URL}/${phoneId}/messages`;
  await axios.post(
    url,
    { messaging_product: "whatsapp", status: "read", message_id: messageId },
    { headers: headers(token) }
  );
}

// Alias for webhook
const markAsReadForCompany = markAsRead;

module.exports = {
  sendText,
  sendTextForCompany,
  sendTemplate,
  sendInteractive,
  sendDocument,
  markAsRead,
  markAsReadForCompany,
};
