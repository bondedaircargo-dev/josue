// WhatsApp message templates — multi-brand, multi-language (ES / EN / HT)
// All functions accept an optional `company` object and `lang` code

function companyName(company) {
  return company?.fullName || "Bonded Air Cargo";
}

function companyPhone(company) {
  return process.env.COMPANY_PHONE || "+1 (305) 000-0000";
}

// ─── Welcome / Menu ───────────────────────────────────────────────────────────

function welcome(name, company, lang = "es") {
  const cn = companyName(company);

  if (lang === "ht") {
    return `Bonjou ${name}! Byenvini nan *${cn}* ✈️

Nou se solisyon ekspedisyon ou *Miami → Repiblik Dominikèn ak Ayiti*.

Ki sa ou vle fè?

1️⃣ Suivi kolis mwen
2️⃣ Mande pri
3️⃣ Tan livrezon
4️⃣ Mande koleksyon

Oswa ekri kesyon ou dirèkteman.`;
  }

  if (lang === "en") {
    return `Hello ${name}! Welcome to *${cn}* ✈️

Your shipping solution *Miami → Dominican Republic & Haiti*.

What would you like to do?

1️⃣ Track my package
2️⃣ Ask about pricing
3️⃣ Delivery time
4️⃣ Request pickup

Or write your question directly.`;
  }

  return `Hola ${name}! Bienvenido/a a *${cn}* ✈️

Somos tu solución de envíos *Miami → República Dominicana y Haití*.

¿Qué deseas hacer?

1️⃣ Rastrear mi paquete
2️⃣ Preguntar por precios
3️⃣ Tiempo de entrega
4️⃣ Solicitar recolección

O escríbeme tu pregunta directamente.`;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

function askForAWB(name, company) {
  return `Claro ${name}, con gusto te ayudo a rastrear tu paquete.

Por favor escríbeme tu *CRN* (ej: CRN-MCP-20260504-1234) o *AWB* (ej: MCP-260504-1234).

Lo encuentras en el recibo de tu envío o en el email de confirmación.`;
}

const STATUS_EMOJI = {
  RECIBIDO: "📦",
  ALMACEN: "🏭",
  EN_TRANSITO: "✈️",
  EN_ADUANA: "🛃",
  DISPONIBLE: "📍",
  ENTREGADO: "✅",
  RETENIDO: "⚠️",
};

const STATUS_MESSAGE_ES = {
  RECIBIDO: "Tu paquete fue recibido en Miami y está siendo procesado.",
  ALMACEN: "Tu paquete está en el almacén en Miami, listo para el próximo vuelo.",
  EN_TRANSITO: "Tu paquete está en camino. Vuelo confirmado.",
  EN_ADUANA: "Tu paquete está en proceso de aduana en destino.",
  DISPONIBLE: "Tu paquete llegó al destino y está disponible para entrega.",
  ENTREGADO: "Tu paquete fue entregado exitosamente. ¡Gracias por confiar en nosotros!",
  RETENIDO: "Tu paquete fue retenido en aduana. Contacta un agente urgente.",
};

function trackingInfo(name, crn, status, destination, company) {
  const emoji = STATUS_EMOJI[status] || "📦";
  const msg = STATUS_MESSAGE_ES[status] || "Estado actualizado.";
  return `${emoji} *Actualización de Envío*

*Ref:* ${crn}
*Destino:* ${destination}
*Estado:* ${status.replace(/_/g, " ")}

${msg}

Para más información escribe al agente de ${companyName(company)}.`;
}

function statusUpdate(name, crn, status, note, company) {
  const emoji = STATUS_EMOJI[status] || "📦";
  return `${emoji} *${companyName(company)}* — Actualización

Hola ${name},

Tu envío *${crn}* cambió de estado:
*→ ${status.replace(/_/g, " ")}*

${note ? `Nota: ${note}` : STATUS_MESSAGE_ES[status] || ""}

¿Alguna pregunta? Escríbenos aquí.`;
}

function shipmentCreated(name, crn, awb, destination, weight, company) {
  return `✅ *¡Envío registrado!*

Hola ${name}, hemos registrado tu paquete:

🔖 *CRN:* ${crn}
📦 *AWB:* ${awb}
📍 *Destino:* ${destination}
⚖️ *Peso:* ${weight} lbs
🔄 *Estado:* RECIBIDO

Guarda tu CRN para rastrear tu envío en cualquier momento.

Tiempo estimado: 3-6 días hábiles.
*${companyName(company)}* — Miami ✈️ RD/Haití`;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function pricingInfo(company, lang = "es") {
  const cn = companyName(company);
  const rate = company?.ratePerLb ? `$${company.ratePerLb.toFixed(2)}` : "$3.50";
  const phone = companyPhone(company);

  if (lang === "ht") {
    return `💲 *Pri ${cn}*

✈️ *Ekspedisyon Aèryen Miami → RD/Ayiti*

📦 Pri de baz: *${rate}/lb*
🏷️ Minimòm: 5 lbs
📋 Dokiman: $15 flat

*Sèvis ki enkli:*
✅ Ranmase nan Miami
✅ Douwàn
✅ Notifikasyon WhatsApp
✅ Suivi an tan reyèl

Pou kotasyon: *COTIZAR*
Telefòn: ${phone}`;
  }

  if (lang === "en") {
    return `💲 *${cn} Rates*

✈️ *Air Freight Miami → DR/Haiti*

📦 Base rate: *${rate}/lb*
🏷️ Minimum: 5 lbs ($${(company?.ratePerLb || 3.5) * 5})
📋 Documents: $15 flat

*Included services:*
✅ Miami-Dade pickup
✅ Customs handling
✅ WhatsApp notifications
✅ Real-time tracking with CRN

For exact quote: *COTIZAR*
Phone: ${phone}`;
  }

  return `💲 *Tarifas ${cn}*

✈️ *Carga Aérea Miami → RD/Haití*

📦 Tarifa base: *${rate}/lb*
🏷️ Mínimo: 5 lbs
📋 Documentos: $15 flat

*Servicios incluidos:*
✅ Pick-up en Miami-Dade
✅ Manejo de aduana
✅ Notificaciones WhatsApp
✅ Tracking con CRN en tiempo real

Para cotización exacta escribe: *COTIZAR*
O llama: ${phone}`;
}

function deliveryTime(lang = "es") {
  if (lang === "en") {
    return `⏱️ *Delivery Times*

*Miami → Dominican Republic*
• Flights: Mon, Wed, Fri
• Delivery: 3-5 business days

*Miami → Haiti*
• Flights: Tue, Thu
• Delivery: 4-6 business days

⚠️ Times may vary due to customs inspection or holidays.
Share your CRN for a confirmed flight update.`;
  }

  return `⏱️ *Tiempos de Entrega*

*Miami → República Dominicana*
• Vuelos: Lun, Mié, Vie
• Entrega: 3-5 días hábiles

*Miami → Haití*
• Vuelos: Mar, Jue
• Entrega: 4-6 días hábiles

⚠️ Los tiempos pueden variar por:
• Inspección de aduana
• Días feriados
• Condiciones del vuelo

Escribe tu CRN para confirmación exacta del vuelo.`;
}

function pickupInfo(company, lang = "es") {
  if (lang === "en") {
    return `🚐 *Miami Pickup Service*

We pick up your package in Miami-Dade.

I need:
📋 Full name
📍 Pickup address
📦 Package description (weight & size approx.)
📅 Preferred date

Schedule: Mon-Fri 9am-5pm | Sat 9am-12pm

Share the details and we'll coordinate!`;
  }

  return `🚐 *Servicio de Recolección en Miami*

Recogemos tu paquete en Miami-Dade.

Necesito:
📋 Nombre completo
📍 Dirección de recolección
📦 Descripción del paquete (peso y tamaño aprox.)
📅 Fecha preferida

Horario: Lun-Vie 9am-5pm | Sáb 9am-12pm

Escríbeme los datos y coordinamos.`;
}

// ─── Complaints & Claims ──────────────────────────────────────────────────────

function complaintReceived(name, crn, company) {
  return `⚠️ *Reclamo Registrado*

Hola ${name},

Hemos registrado tu reclamo:

🔖 *Referencia:* ${crn}
🏢 *Empresa:* ${companyName(company)}

Un agente revisará tu caso en *24-48 horas hábiles*.

Guarda este número de referencia para dar seguimiento.`;
}

function complaintResolved(name, crn, resolution, company) {
  return `✅ *Reclamo Resuelto*

Hola ${name},

Tu reclamo *${crn}* fue resuelto.

${resolution ? `📋 *Resolución:* ${resolution}` : ""}

Gracias por tu paciencia. *${companyName(company)}* valora tu confianza.`;
}

// ─── Franchise ────────────────────────────────────────────────────────────────

function franchiseInfo(company) {
  return `🤝 *Oportunidad de Franquicia — ${companyName(company)}*

¿Quieres ser un punto de envío autorizado?

✅ Bajo costo de entrada
✅ Comisiones por volumen
✅ Sistema y capacitación incluidos
✅ Material de marketing
✅ Soporte operativo

Para comenzar necesito:
1. Tu nombre completo
2. Ciudad / zona donde operarías
3. ¿Tienes local o área de atención?

Escríbenos y un asesor te contactará.`;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

function paymentInfo(company) {
  return `💳 *Métodos de Pago — ${companyName(company)}*

Aceptamos:
💚 *Zelle:* ${process.env.PAYMENT_ZELLE || "info@bondedaircargo.com"}
📱 *Cash App:* ${process.env.PAYMENT_CASH_APP || "$bondedaircargo"}
💵 *Efectivo:* en nuestra oficina Miami
🏦 *Transferencia bancaria:* solicitar con agente

Después de pagar, envíanos el *comprobante* por aquí para confirmar y emitir tu recibo.

¿Tienes tu CRN o AWB a la mano?`;
}

// ─── Agent transfer ───────────────────────────────────────────────────────────

function transferToAgent(name, company, agentName = "un agente") {
  return `Entendido ${name}, te transfiero con ${agentName} de *${companyName(company)}*.

Un momento por favor...

🕐 Horario de atención:
Lun-Vie: 9am-6pm ET
Sáb: 9am-1pm ET

Si es urgente llama: ${companyPhone(company)}`;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function thankYou(name, company) {
  return `Con gusto, ${name}! 😊

Estamos para servirte. Que tengas un excelente día.

*${companyName(company)}* — Miami ✈️ RD/Haití`;
}

function defaultReply(name, company) {
  return `Hola ${name}! Recibimos tu mensaje en *${companyName(company)}*.

Un agente te atenderá en breve. Horario: Lun-Vie 9am-6pm ET.

Mientras tanto puedes escribir:
1️⃣ Rastrear mi paquete
2️⃣ Ver precios
3️⃣ Tiempo de entrega

*${companyName(company)}* ✈️`;
}

function paymentReminder(name, crn, amount, company) {
  return `💳 *Recordatorio de Pago*

Hola ${name},

Tienes un saldo pendiente con *${companyName(company)}*:

🔖 *Ref:* ${crn}
💰 *Monto:* $${amount.toFixed(2)}

Para continuar el proceso de tu envío, por favor realiza tu pago.

Métodos disponibles: Zelle, Cash App, efectivo.
Escríbenos para más información.`;
}

function preAlertConfirmed(name, crn, flightDate, company) {
  return `✈️ *Pre-Alerta Registrada*

Hola ${name},

Tu pre-alerta fue registrada exitosamente.

🔖 *CRN:* ${crn}
📅 *Fecha de vuelo:* ${flightDate || "Por confirmar"}

Aduana fue notificada. Guarda tu CRN para seguimiento.

*${companyName(company)}* ✈️`;
}

module.exports = {
  welcome,
  askForAWB,
  trackingInfo,
  statusUpdate,
  shipmentCreated,
  pricingInfo,
  deliveryTime,
  pickupInfo,
  complaintReceived,
  complaintResolved,
  franchiseInfo,
  paymentInfo,
  paymentReminder,
  preAlertConfirmed,
  transferToAgent,
  thankYou,
  defaultReply,
};
