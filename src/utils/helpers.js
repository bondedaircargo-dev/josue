const { v4: uuidv4 } = require("uuid");
const { format } = require("date-fns");

// CRN = CRN-[EMPRESA]-[YYYYMMDD]-[XXXX]
// Universal connector: links customer, shipment, quote, invoice, claim, agent, status
function generateCRN(companyId = "MCP", suffix = null) {
  const date = format(new Date(), "yyyyMMdd");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const base = `CRN-${companyId.toUpperCase()}-${date}-${rand}`;
  return suffix ? `${base}-${suffix}` : base;
}

function generateAWB(prefix = "BAC") {
  const date = format(new Date(), "yyMMdd");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${rand}`;
}

function generateInvoiceNumber(companyId = "MCP") {
  const date = format(new Date(), "yyyyMM");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${companyId.toUpperCase()}-${date}-${rand}`;
}

function generateTrackingId() {
  return uuidv4().split("-")[0].toUpperCase();
}

// Strip all non-digits — keeps international format safe
function formatPhone(phone) {
  return (phone || "").replace(/[^\d]/g, "");
}

function sanitizeText(text) {
  return (text || "").trim().toLowerCase();
}

// Returns today's date as YYYY-MM-DD
function today() {
  return format(new Date(), "yyyy-MM-dd");
}

module.exports = {
  generateCRN,
  generateAWB,
  generateInvoiceNumber,
  generateTrackingId,
  formatPhone,
  sanitizeText,
  today,
};
