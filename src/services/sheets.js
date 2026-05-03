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

module.exports = { appendRow, getRows, updateRow, logShipment, logCustomer };
