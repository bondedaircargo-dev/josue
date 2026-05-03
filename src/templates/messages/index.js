// WhatsApp message templates for Bonded Air Cargo
// Miami → Dominican Republic / Haiti

const COMPANY = "Bonded Air Cargo";

function welcome(name) {
  return `Hola ${name}! Bienvenido/a a *${COMPANY}* ✈️

Somos tu solución de envíos *Miami → República Dominicana y Haití*.

¿Qué deseas hacer?

1️⃣ Rastrear mi paquete
2️⃣ Preguntar por precios
3️⃣ Tiempo de entrega
4️⃣ Solicitar recolección

O escríbeme tu pregunta directamente.`;
}

function askForAWB(name) {
  return `Claro ${name}, con gusto te ayudo a rastrear tu paquete.

Por favor escríbeme tu número de *AWB* (ej: BAC-250103-4521).

Lo encuentras en el recibo de tu envío o en el email de confirmación.`;
}

function trackingInfo(name, awb, status, destination) {
  const statusEmoji = {
    RECIBIDO: "📦",
    EN_TRANSITO: "✈️",
    EN_ADUANA: "🛃",
    EN_DESTINO: "📍",
    ENTREGADO: "✅",
    RETENIDO: "⚠️",
  };
  const emoji = statusEmoji[status] || "📦";
  return `${emoji} *Actualización de tu envío*

*AWB #:* ${awb}
*Destino:* ${destination}
*Estado:* ${status.replace(/_/g, " ")}

${getStatusMessage(status)}

Para más info escribe a un agente.`;
}

function getStatusMessage(status) {
  const msgs = {
    RECIBIDO: "Tu paquete fue recibido en Miami y está siendo procesado.",
    EN_TRANSITO: "Tu paquete está en camino. Vuelo confirmado.",
    EN_ADUANA: "Tu paquete está en proceso de aduana en destino.",
    EN_DESTINO: "Tu paquete llegó al destino y está listo para entrega.",
    ENTREGADO: "Tu paquete fue entregado exitosamente. Gracias por usar Bonded Air Cargo.",
    RETENIDO: "Tu paquete fue retenido en aduana. Contacta a un agente para más detalles.",
  };
  return msgs[status] || "Estado actualizado.";
}

function statusUpdate(name, awb, status, note) {
  const statusEmoji = {
    RECIBIDO: "📦",
    EN_TRANSITO: "✈️",
    EN_ADUANA: "🛃",
    EN_DESTINO: "📍",
    ENTREGADO: "✅",
    RETENIDO: "⚠️",
  };
  const emoji = statusEmoji[status] || "📦";
  return `${emoji} *${COMPANY}* - Actualización de Envío

Hola ${name},

Tu paquete *AWB ${awb}* cambió de estado:
*→ ${status.replace(/_/g, " ")}*

${note ? `Nota: ${note}` : getStatusMessage(status)}

¿Tienes alguna pregunta? Escríbenos aquí.`;
}

function shipmentCreated(name, awb, destination, weight) {
  return `✅ *¡Envío registrado exitosamente!*

Hola ${name}, hemos registrado tu paquete:

📦 *AWB #:* ${awb}
📍 *Destino:* ${destination}
⚖️ *Peso:* ${weight} lbs
🔄 *Estado:* RECIBIDO

Guarda este número AWB para rastrear tu envío.

Tiempo estimado: 3-5 días hábiles.
*${COMPANY}* - Miami ✈️ RD/Haití`;
}

function pricingInfo() {
  return `💲 *Tarifas Bonded Air Cargo*

✈️ *Carga Aérea Miami → RD/Haití*

📦 Tarifa base: *$3.50/lb*
🏷️ Mínimo: 5 lbs ($17.50)
📋 Documentos: $15 flat

*Servicios incluidos:*
✅ Pick-up en Miami (área Miami-Dade)
✅ Manejo de aduana
✅ Notificaciones por WhatsApp
✅ Tracking en tiempo real

*Destinos:*
🇩🇴 Santo Domingo, Santiago, otras ciudades
🇭🇹 Puerto Príncipe, Cap-Haïtien

Para cotización exacta escribe: *COTIZAR*
O llama: ${process.env.COMPANY_PHONE || "+1 (305) 000-0000"}`;
}

function deliveryTime() {
  return `⏱️ *Tiempos de Entrega*

*Miami → República Dominicana*
• Vuelos: Lun, Mié, Vie
• Entrega: 3-5 días hábiles
• Aeropuerto: Las Américas (SDQ)

*Miami → Haití*
• Vuelos: Mar, Jue
• Entrega: 4-6 días hábiles
• Aeropuerto: Toussaint Louverture (PAP)

⚠️ Los tiempos pueden variar por:
• Inspección de aduana
• Días feriados
• Condiciones del vuelo

Para confirmación exacta de vuelo escribe tu AWB.`;
}

function pickupInfo() {
  return `🚐 *Servicio de Recolección en Miami*

Recogemos tu paquete en Miami-Dade.

Para agendar una recolección necesito:
📋 Nombre completo
📍 Dirección de recolección
📦 Descripción del paquete (aprox. peso y tamaño)
📅 Fecha preferida

Horario de recolección:
Lun-Vie: 9am - 5pm
Sábados: 9am - 12pm

Escríbeme los datos y coordinamos.`;
}

function thankYou(name) {
  return `Con gusto, ${name}! 😊

Estamos para servirte. Que tengas un excelente día.

*${COMPANY}* - Miami ✈️ RD/Haití`;
}

function transferToAgent(name) {
  return `Entendido ${name}, te transferiré con un agente.

Un momento por favor...

Horario de atención: Lun-Vie 9am-6pm ET
Sábados: 9am-1pm ET

Si es urgente llama al: ${process.env.COMPANY_PHONE || "+1 (305) 000-0000"}`;
}

function defaultReply(name) {
  return `Hola ${name}! Recibimos tu mensaje.

Un agente te atenderá en breve. Nuestro horario es Lun-Vie 9am-6pm ET.

Mientras tanto puedes escribir:
1️⃣ Para rastrear tu paquete
2️⃣ Para ver precios
3️⃣ Para tiempo de entrega

*${COMPANY}* ✈️`;
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
  thankYou,
  transferToAgent,
  defaultReply,
};
