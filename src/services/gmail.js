const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEmail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"Bonded Air Cargo" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
  logger.info(`Email sent to ${to}: ${subject}`);
  return info;
}

async function sendTrackingEmail(customer, shipment) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">Bonded Air Cargo - Actualización de Envío</h2>
      <p>Estimado/a <strong>${customer.name}</strong>,</p>
      <p>Le informamos que su paquete tiene la siguiente actualización:</p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px; border:1px solid #ddd;"><strong>AWB #</strong></td><td style="padding:8px; border:1px solid #ddd;">${shipment.awb}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Estado</strong></td><td style="padding:8px; border:1px solid #ddd;">${shipment.status}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Origen</strong></td><td style="padding:8px; border:1px solid #ddd;">Miami, FL</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Destino</strong></td><td style="padding:8px; border:1px solid #ddd;">${shipment.destination}</td></tr>
        <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Peso</strong></td><td style="padding:8px; border:1px solid #ddd;">${shipment.weight} lbs</td></tr>
      </table>
      <p style="margin-top:20px; color:#666;">Si tiene alguna pregunta, contáctenos por WhatsApp o al email info@bondedaircargo.com</p>
    </div>
  `;
  return sendEmail({ to: customer.email, subject: `Actualización AWB ${shipment.awb}`, html });
}

async function sendInvoiceEmail(customer, invoiceNumber, pdfBuffer) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a56db;">Bonded Air Cargo - Factura ${invoiceNumber}</h2>
      <p>Estimado/a <strong>${customer.name}</strong>,</p>
      <p>Adjunto encontrará su factura <strong>${invoiceNumber}</strong>.</p>
      <p>Gracias por confiar en Bonded Air Cargo para sus envíos Miami → República Dominicana / Haití.</p>
    </div>
  `;
  return sendEmail({
    to: customer.email,
    subject: `Factura ${invoiceNumber} - Bonded Air Cargo`,
    html,
    attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }],
  });
}

module.exports = { sendEmail, sendTrackingEmail, sendInvoiceEmail };
