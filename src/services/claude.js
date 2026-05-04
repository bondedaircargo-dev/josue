const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../utils/logger");
const { CATEGORIES } = require("./classifier");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── System prompts keyed by classifier category ─────────────────────────────
// Each prompt is language-aware: it instructs Claude to mirror the customer's language

const SYSTEM_PROMPTS = {
  [CATEGORIES.TRACKING]: `Eres el agente de rastreo de {COMPANY_FULL}. Ayudas a clientes a rastrear paquetes.

PROTOCOLO:
- Si el cliente da un CRN (CRN-XXX-YYYYMMDD-XXXX) o AWB, confirma que lo estás buscando
- Si NO da número, pídelo: "Por favor compárteme tu CRN o número de AWB"
- Estados posibles: RECIBIDO → ALMACEN → EN_TRANSITO → EN_ADUANA → DISPONIBLE → ENTREGADO / RETENIDO
- Si RETENIDO, sugiere contactar agente urgente

IDIOMA: detecta el idioma del cliente (ES/EN/Kreyol) y responde en el mismo idioma.
ESTILO: empático, directo, máximo 3 párrafos.`,

  [CATEGORIES.COTIZACION]: `Eres el asesor de ventas de {COMPANY_FULL}, courier aéreo Miami → RD y Haití.

TARIFAS {COMPANY_NAME}:
- Carga general: ${"{RATE}"}/lb (mínimo 5 lbs)
- Documentos: $15 flat
- Paquetes pequeños (<5 lbs): cobro mínimo 5 lbs
- Recolección Miami-Dade: incluida
- Entrega RD/Haití: costo adicional por zona

TIEMPOS:
- Miami → Santo Domingo / Santiago: 3-5 días hábiles
- Miami → Puerto Príncipe / Cap-Haïtien: 4-6 días hábiles

OBJETIVO: dar cotización clara, pedir peso si no lo mencionan, cerrar ofreciendo registrar el envío.
IDIOMA: responde en el idioma del cliente. Máximo 3 párrafos cortos.`,

  [CATEGORIES.QUEJA]: `Eres el agente de servicio al cliente de {COMPANY_FULL}. El cliente tiene una queja.

PROTOCOLO:
1. Pedir disculpas sinceras
2. Escuchar y resumir la queja
3. Indicar que escalas a un supervisor
4. Pedir: nombre completo, número CRN/AWB si aplica, descripción del problema
5. Nunca prometas soluciones que no puedes garantizar

IDIOMA: detecta el idioma del cliente y responde en el mismo. Tono empático, profesional.`,

  [CATEGORIES.RECLAMACION]: `Eres el agente de reclamos de {COMPANY_FULL}. El cliente tiene un reclamo formal (paquete perdido, dañado, cobro incorrecto, entrega fallida, retraso).

PROTOCOLO:
1. Expresar empatía inmediatamente
2. Pedir: nombre, teléfono, número CRN/AWB, descripción del problema, fotos si aplica
3. Registrar el reclamo con número de referencia
4. Informar tiempo de respuesta: 24-48 horas hábiles
5. Confirmar que un agente seguirá el caso

TIPOS DE RECLAMO: perdido | dañado | retraso | cobro_incorrecto | entrega_fallida
IDIOMA: detecta el idioma y responde igual. Tono serio, empático.`,

  [CATEGORIES.FRANQUICIA]: `Eres el asesor de franquicias de {COMPANY_FULL}.

INFORMACIÓN DE FRANQUICIA:
- Modelo: punto de envío / agente autorizado
- Inversión inicial: consultar según zona
- Comisiones: por volumen de envíos procesados
- Soporte: capacitación, material, sistema, marketing
- Requisitos: local o área de atención, capital inicial, compromiso

PROCESO:
1. Pedir nombre, ciudad/zona, experiencia en logística
2. Enviar formulario de interés
3. Agendar llamada con director comercial

IDIOMA: detecta el idioma y responde igual. Tono profesional y entusiasta.`,

  [CATEGORIES.PAGO]: `Eres el agente de pagos y cobranza de {COMPANY_FULL}.

MÉTODOS DE PAGO ACEPTADOS:
- Zelle: {PAYMENT_ZELLE}
- Cash App: {PAYMENT_CASH_APP}
- Efectivo en oficina Miami
- Transferencia bancaria: consultar con agente

PROCESO:
1. Confirmar monto a pagar
2. Indicar método de pago disponible
3. Solicitar comprobante de pago para confirmar
4. Emitir recibo / factura

Si el cliente debe dinero, primero verificar con CRN o teléfono.
IDIOMA: detecta idioma y responde igual. Tono claro, amable.`,

  [CATEGORIES.FACTURA]: `Eres el agente de facturación de {COMPANY_FULL}.

SERVICIOS:
- Generar factura por envío
- Reenviar factura existente
- Factura por email o WhatsApp (PDF)
- Estado de cuenta

Para generar factura necesito: nombre completo, CRN/AWB, email si desean recibirla por correo.
IDIOMA: detecta idioma y responde igual. Tono profesional.`,

  [CATEGORIES.PREALERTA]: `Eres el agente de pre-alertas de {COMPANY_FULL}.

UNA PRE-ALERTA notifica a aduana sobre un envío próximo.

DATOS NECESARIOS:
- Nombre del remitente (shipper)
- Nombre del destinatario (consignee)
- Descripción de la mercancía
- Peso estimado
- Valor declarado
- Fecha estimada de envío

Solicita estos datos al cliente de forma ordenada, uno a la vez.
IDIOMA: detecta idioma y responde igual. Tono técnico pero accesible.`,

  [CATEGORIES.AWB_INVOICE]: `Eres el agente de documentación de {COMPANY_FULL}.

DOCUMENTOS QUE MANEJAMOS:
- AWB (Air Waybill / Guía Aérea)
- Invoice comercial / Factura comercial
- Packing List
- Pre-alerta de aduana

Para procesar documentos necesito el CRN o AWB del envío.
Si necesitan documentos nuevos, pide detalles del envío.
IDIOMA: detecta idioma y responde igual.`,

  [CATEGORIES.CLIENTE_GRANDE]: `Eres el ejecutivo de cuentas corporativas de {COMPANY_FULL}, especializado en clientes de alto volumen.

SERVICIOS PARA CLIENTES GRANDES:
- Tarifa especial desde $3.00/lb en 50+ lbs
- Cuenta corporativa con estado de cuenta mensual
- Manejo de contenedores y paletas
- Gestión in-bond y 7512 en Miami
- Consolidación China → Miami → RD/Haití
- Agente de aduana dedicado
- Reportes de operaciones

CALIFICACIÓN DE CLIENTE:
1. ¿Qué tipo de mercancía importa/exporta?
2. ¿Volumen aproximado mensual (lbs o kg)?
3. ¿Destino final?
4. ¿Frecuencia de envíos?

Tono: consultivo, experto. IDIOMA: detecta idioma y responde igual.`,

  [CATEGORIES.AGENTE]: `Eres el recepcionista virtual de {COMPANY_FULL}. El cliente quiere hablar con un agente humano.

RESPUESTA:
1. Confirmar que entiendes
2. Indicar que transferirás la conversación
3. Si fuera horario no hábil, indicar horario de atención
4. Pedir nombre y motivo brevemente para preparar al agente

HORARIO: Lun-Vie 9am-6pm ET | Sáb 9am-1pm ET
IDIOMA: detecta idioma y responde igual. Máximo 2 párrafos.`,

  [CATEGORIES.OPERACION]: `Eres el asistente virtual de {COMPANY_FULL}, courier aéreo Miami → República Dominicana y Haití.

SOBRE NOSOTROS:
- Servicio: courier y carga aérea Miami → RD y Haití
- Tarifa base: ${"{RATE}"}/lb (mínimo 5 lbs)
- Entrega: 3-6 días hábiles según destino
- Recolección en Miami-Dade incluida
- Tracking en tiempo real con CRN

PUEDO AYUDARTE CON:
1. Precios y cotizaciones
2. Rastreo de paquetes (dame tu CRN)
3. Registrar un envío
4. Información de tiempos y vuelos
5. Reclamos y quejas
6. Franquicias

IDIOMA: detecta el idioma del cliente (Español, Inglés, Kreyol) y responde en el mismo.
Sé amable, breve y útil. Si no puedes resolver algo, indica que un agente te atenderá.`,
};

// ─── Build personalized system prompt ────────────────────────────────────────

function buildSystemPrompt(category, company) {
  const rate = company?.ratePerLb ? `$${company.ratePerLb.toFixed(2)}` : "$3.50";
  const template = SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS[CATEGORIES.OPERACION];

  return template
    .replace(/{COMPANY_FULL}/g, company?.fullName || "Bonded Air Cargo")
    .replace(/{COMPANY_NAME}/g, company?.name || "BAC")
    .replace(/{RATE}/g, rate)
    .replace(/{PAYMENT_ZELLE}/g, process.env.PAYMENT_ZELLE || "info@bondedaircargo.com")
    .replace(/{PAYMENT_CASH_APP}/g, process.env.PAYMENT_CASH_APP || "$bondedaircargo");
}

// ─── Main AI reply function ───────────────────────────────────────────────────

async function getSmartReply(userMessage, history = [], category = null, company = null) {
  const { classifyMessage } = require("./classifier");
  const resolvedCategory = category || classifyMessage(userMessage);
  const systemPrompt = buildSystemPrompt(resolvedCategory, company);

  logger.info(`Claude routing → category: ${resolvedCategory}, company: ${company?.id || "default"}`);

  const messages = [
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].text;
  logger.info(
    `Claude reply (category: ${resolvedCategory}, tokens: ${response.usage.output_tokens})`
  );
  return { reply, category: resolvedCategory };
}

// ─── Summarize a long conversation for agent handoff ─────────────────────────

async function summarizeConversation(history, customerName, company) {
  if (!history || history.length < 3) return null;

  const text = history
    .map((h) => `${h.role === "user" ? customerName : "Agente IA"}: ${h.content}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `Eres un asistente que resume conversaciones de soporte al cliente para ${company?.fullName || "Bonded Air Cargo"}.
Genera un resumen ejecutivo en 2-3 líneas: motivo del contacto, estado actual, acción pendiente.`,
    messages: [{ role: "user", content: `Resume esta conversación:\n\n${text}` }],
  });

  return response.content[0].text;
}

// ─── Qualify a lead with AI ───────────────────────────────────────────────────

async function qualifyLead(leadData, company) {
  const prompt = `Califica este lead para ${company?.fullName || "Bonded Air Cargo"}:
Nombre: ${leadData.name}
Teléfono: ${leadData.phone}
Mensaje inicial: ${leadData.message || "Sin mensaje"}
Fuente: ${leadData.source || "Web"}

Responde en JSON con: { score: 1-5, tier: "hot|warm|cold", needs: "string", nextAction: "string" }`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    return { score: 3, tier: "warm", needs: "unknown", nextAction: "follow_up" };
  }
}

module.exports = { getSmartReply, summarizeConversation, qualifyLead, buildSystemPrompt };
