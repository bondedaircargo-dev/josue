const { v4: uuidv4 } = require("uuid");
const { format } = require("date-fns");

function generateAWB(prefix = "BAC") {
  const date = format(new Date(), "yyMMdd");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${rand}`;
}

function generateInvoiceNumber() {
  const date = format(new Date(), "yyyyMM");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${date}-${rand}`;
}

function generateTrackingId() {
  return uuidv4().split("-")[0].toUpperCase();
}

function formatPhone(phone) {
  return phone.replace(/[^\d]/g, "");
}

function sanitizeText(text) {
  return (text || "").trim().toLowerCase();
}

module.exports = {
  generateAWB,
  generateInvoiceNumber,
  generateTrackingId,
  formatPhone,
  sanitizeText,
};
