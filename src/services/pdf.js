const PDFDocument = require("pdfkit");
const { format } = require("date-fns");
const logger = require("../utils/logger");

function buildBuffer(fn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    fn(doc);
    doc.end();
  });
}

async function generateInvoice(invoice) {
  logger.info(`Generating invoice PDF: ${invoice.number}`);
  return buildBuffer((doc) => {
    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("BONDED AIR CARGO", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("Miami, FL | bondedaircargo.com", { align: "center" });
    doc.moveDown();

    doc.fontSize(16).font("Helvetica-Bold").text("FACTURA / INVOICE", { align: "center" });
    doc.moveDown(0.5);

    // Invoice meta
    doc.fontSize(10).font("Helvetica");
    doc.text(`Factura #: ${invoice.number}`, 50);
    doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy")}`);
    doc.text(`AWB #: ${invoice.awb || "N/A"}`);
    doc.moveDown();

    // Customer
    doc.font("Helvetica-Bold").text("CLIENTE:");
    doc.font("Helvetica");
    doc.text(`Nombre: ${invoice.customerName}`);
    doc.text(`Teléfono: ${invoice.customerPhone}`);
    if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`);
    doc.text(`Destino: ${invoice.destination}`);
    doc.moveDown();

    // Items table
    doc.font("Helvetica-Bold");
    doc.text("Descripción", 50, doc.y, { width: 250, continued: true });
    doc.text("Cant.", { width: 80, continued: true, align: "right" });
    doc.text("Precio", { width: 100, continued: true, align: "right" });
    doc.text("Total", { width: 100, align: "right" });
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.font("Helvetica");
    doc.moveDown(0.3);

    let subtotal = 0;
    for (const item of invoice.items || []) {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      doc.text(item.description, 50, doc.y, { width: 250, continued: true });
      doc.text(String(item.quantity), { width: 80, continued: true, align: "right" });
      doc.text(`$${item.unitPrice.toFixed(2)}`, { width: 100, continued: true, align: "right" });
      doc.text(`$${lineTotal.toFixed(2)}`, { width: 100, align: "right" });
    }

    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();

    // Totals
    const tax = subtotal * (invoice.taxRate || 0);
    const total = subtotal + tax;
    doc.font("Helvetica-Bold");
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, { align: "right" });
    if (tax > 0) doc.text(`Impuesto (${(invoice.taxRate * 100).toFixed(0)}%): $${tax.toFixed(2)}`, { align: "right" });
    doc.fontSize(13).text(`TOTAL: $${total.toFixed(2)}`, { align: "right" });

    // Notes
    if (invoice.notes) {
      doc.moveDown();
      doc.fontSize(9).font("Helvetica").text(`Notas: ${invoice.notes}`);
    }

    // Footer
    doc.fontSize(8).text("Gracias por su preferencia. Bonded Air Cargo.", 50, 720, { align: "center" });
  });
}

async function generateAWBReport(shipments) {
  logger.info("Generating AWB report PDF");
  return buildBuffer((doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("BONDED AIR CARGO", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Reporte de AWB / Air Waybills", { align: "center" });
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, { align: "center" });
    doc.moveDown();

    // Column headers
    const cols = { awb: 50, customer: 130, dest: 290, weight: 380, status: 440, date: 490 };
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("AWB #", cols.awb, doc.y, { continued: true });
    doc.text("Cliente", cols.customer - doc.x + cols.awb, { continued: true });
    doc.text("Destino", { continued: true });
    doc.text("Peso", { continued: true });
    doc.text("Estado", { continued: true });
    doc.text("Fecha");
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(8);
    for (const s of shipments) {
      const y = doc.y;
      doc.text(s.awb || "", cols.awb, y, { width: 75 });
      doc.text(s.customerName || "", cols.customer, y, { width: 155 });
      doc.text(s.destination || "", cols.dest, y, { width: 85 });
      doc.text(`${s.weight || 0} lbs`, cols.weight, y, { width: 55 });
      doc.text(s.status || "", cols.status, y, { width: 45 });
      doc.text(s.date || "", cols.date, y, { width: 60 });
      doc.moveDown(0.5);

      if (doc.y > 720) {
        doc.addPage();
        doc.moveDown();
      }
    }

    doc.fontSize(8).text(`Total registros: ${shipments.length}`, 50, doc.y + 10);
  });
}

async function generatePreAlert(shipment) {
  logger.info(`Generating pre-alert PDF for AWB: ${shipment.awb}`);
  return buildBuffer((doc) => {
    doc.fontSize(18).font("Helvetica-Bold").text("BONDED AIR CARGO", { align: "center" });
    doc.fontSize(14).text("PRE-ALERTA / PRE-ALERT", { align: "center" });
    doc.moveDown();

    doc.fontSize(10).font("Helvetica");
    doc.text(`AWB #: ${shipment.awb}`);
    doc.text(`Fecha de vuelo: ${shipment.flightDate || "Por confirmar"}`);
    doc.text(`Vuelo #: ${shipment.flightNumber || "Por confirmar"}`);
    doc.text(`Origen: Miami International Airport (MIA)`);
    doc.text(`Destino: ${shipment.destinationAirport || shipment.destination}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text("SHIPPER (REMITENTE):");
    doc.font("Helvetica");
    doc.text(`${shipment.shipperName || "Bonded Air Cargo"}`);
    doc.text(`Miami, FL, USA`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text("CONSIGNEE (DESTINATARIO):");
    doc.font("Helvetica");
    doc.text(`${shipment.customerName}`);
    doc.text(`${shipment.customerAddress || ""}`);
    doc.text(`${shipment.destination}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text("DESCRIPCIÓN DE LA CARGA:");
    doc.font("Helvetica");
    doc.text(`Descripción: ${shipment.description}`);
    doc.text(`Piezas: ${shipment.pieces}`);
    doc.text(`Peso bruto: ${shipment.weight} lbs`);
    doc.text(`Valor declarado: $${shipment.value || "0.00"}`);
    doc.moveDown();

    doc.fontSize(8).text(
      "Este documento es una pre-alerta de carga. Bonded Air Cargo no se responsabiliza por retrasos causados por aduana.",
      { align: "center" }
    );
  });
}

module.exports = { generateInvoice, generateAWBReport, generatePreAlert };
