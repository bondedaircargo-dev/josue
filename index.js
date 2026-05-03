require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WEBHOOK_VERIFY_TOKEN,
  PORT = 3000,
} = process.env;

// Webhook verification (Meta requires this GET handshake)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified.");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// Receive incoming WhatsApp messages
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object !== "whatsapp_business_account") {
    return res.sendStatus(404);
  }

  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return res.sendStatus(200);
  }

  const from = message.from;
  const msgType = message.type;

  let incomingText = "";
  if (msgType === "text") {
    incomingText = message.text.body;
  } else {
    incomingText = `[${msgType}]`;
  }

  console.log(`Message from ${from}: ${incomingText}`);

  const replyText = buildReply(incomingText);

  try {
    await sendMessage(from, replyText);
  } catch (err) {
    console.error("Error sending reply:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});

function buildReply(text) {
  const lower = text.toLowerCase().trim();

  if (lower.includes("hola") || lower.includes("hello") || lower.includes("hi")) {
    return "Hola! Gracias por escribirnos. ¿En qué podemos ayudarte?";
  }

  if (lower.includes("precio") || lower.includes("price") || lower.includes("costo")) {
    return "Para información sobre precios, por favor escríbenos a ventas@ejemplo.com o llámanos al +1-800-000-0000.";
  }

  if (lower.includes("horario") || lower.includes("hora") || lower.includes("schedule")) {
    return "Nuestro horario de atención es de Lunes a Viernes de 9am a 6pm (hora Ciudad de México).";
  }

  if (lower.includes("gracias") || lower.includes("thank")) {
    return "Con gusto! Si necesitas algo más, aquí estaremos.";
  }

  return `Recibimos tu mensaje: "${text}". Un agente te atenderá en breve. Gracias por tu paciencia!`;
}

async function sendMessage(to, text) {
  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

app.listen(PORT, () => {
  console.log(`WhatsApp webhook server running on port ${PORT}`);
});
