const { google } = require("googleapis");
const logger = require("../utils/logger");

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

async function appendRow(spreadsheetId, range, values) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [values] },
  });
  logger.info(`Row appended to Google Sheets: ${range}`);
  return res.data;
}

async function getRows(spreadsheetId, range) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
}

async function updateRow(spreadsheetId, range, values) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [values] },
  });
  return res.data;
}

async function logShipment(shipment) {
  const sheetId = process.env.GOOGLE_SHEET_SHIPMENTS_ID;
  const { format } = require("date-fns");
  return appendRow(sheetId, "Shipments!A:M", [
    shipment.awb,
    shipment.customerName,
    shipment.customerPhone,
    shipment.origin || "Miami, FL",
    shipment.destination,
    shipment.weight,
    shipment.pieces,
    shipment.description,
    shipment.status,
    shipment.invoiceNumber || "",
    shipment.value || "",
    format(new Date(), "yyyy-MM-dd HH:mm"),
    shipment.notes || "",
  ]);
}

async function logCustomer(customer) {
  const sheetId = process.env.GOOGLE_SHEET_CUSTOMERS_ID;
  const { format } = require("date-fns");
  return appendRow(sheetId, "Customers!A:F", [
    customer.name,
    customer.phone,
    customer.email || "",
    customer.address || "",
    customer.country || "",
    format(new Date(), "yyyy-MM-dd"),
  ]);
}

// Guarda CADA mensaje entrante en la hoja de mensajes (siempre agrega una fila)
async function logMessage(msg) {
  const sheetId = process.env.GOOGLE_SHEET_MESSAGES_ID;
  if (!sheetId) return;
  const { format } = require("date-fns");
  return appendRow(sheetId, "Messages!A:E", [
    format(new Date(), "yyyy-MM-dd HH:mm"),
    msg.phone,
    msg.name || "",
    msg.text || "",
    msg.type || "",
  ]);
}

// Guarda el contacto solo si su teléfono no está ya en la hoja (evita duplicados)
async function upsertCustomer(customer) {
  const sheetId = process.env.GOOGLE_SHEET_CUSTOMERS_ID;
  if (!sheetId) return;
  try {
    const rows = await getRows(sheetId, "Customers!B:B");
    const exists = rows.some((r) => (r[0] || "").trim() === customer.phone);
    if (exists) return;
  } catch (_) {}
  return logCustomer(customer);
}

module.exports = {
  appendRow,
  getRows,
  updateRow,
  logShipment,
  logCustomer,
  logMessage,
  upsertCustomer,
};
