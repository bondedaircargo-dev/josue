const axios = require("axios");
const logger = require("../utils/logger");

const BASE_URL = "https://graph.facebook.com/v18.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function sendText(to, body) {
  const url = `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  const res = await axios.post(url, payload, { headers: getHeaders() });
  logger.info(`WhatsApp text sent to ${to}`);
  return res.data;
}

async function sendTemplate(to, templateName, langCode = "es", components = []) {
  const url = `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: langCode },
      components,
    },
  };
  const res = await axios.post(url, payload, { headers: getHeaders() });
  logger.info(`WhatsApp template "${templateName}" sent to ${to}`);
  return res.data;
}

async function sendInteractive(to, body, buttons) {
  const url = `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`;
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
  const res = await axios.post(url, payload, { headers: getHeaders() });
  logger.info(`WhatsApp interactive message sent to ${to}`);
  return res.data;
}

async function sendDocument(to, documentUrl, caption, filename) {
  const url = `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: { link: documentUrl, caption, filename },
  };
  const res = await axios.post(url, payload, { headers: getHeaders() });
  logger.info(`WhatsApp document sent to ${to}: ${filename}`);
  return res.data;
}

async function markAsRead(messageId) {
  const url = `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`;
  await axios.post(
    url,
    { messaging_product: "whatsapp", status: "read", message_id: messageId },
    { headers: getHeaders() }
  );
}

module.exports = { sendText, sendTemplate, sendInteractive, sendDocument, markAsRead };
