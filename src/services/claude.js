const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../utils/logger");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Client type detection ────────────────────────────────────────────────────

const CLIENT_TYPES = {
  PRECIO: "precio",
  TRACKING: "tracking",
  CHINA: "china",
  HAITI: "haiti",
  GENERAL: "general",
};

function detectClientType(text) {
  const t = text.toLowerCase();

  if (
    t.includes("china") || t.includes("chino") || t.includes("alibaba") ||
    t.includes("aliexpress") || t.includes("shein") || t.includes("temu") ||
    t.includes("importa") || t.includes("import")
  ) return CLIENT_TYPES.CHINA;

  if (
    t.includes("haití") || t.includes("haiti") || t.includes("port-au-prince") ||
    t.includes("puerto principe") || t.includes("cap-haïtien") || t.includes("ayiti") ||
    t.includes("bonswa") || t.includes("mèsi") || t.includes("creole") ||
    t.includes("cap haïtien") || t.includes("gonaives")
  ) return CLIENT_TYPES.HAITI;

  if (
    t.includes("rastrear") || t.includes("tracking") || t.includes("awb") ||
    t.includes("donde está") || t.includes("donde esta") || t.includes("mi paquete") ||
    t.includes("llegó") || t.includes("llego") || t.includes("entregado") ||
    t.includes("bac-") || /bac-\d/i.test(t)
  ) return CLIENT_TYPES.TRACKING;

  if (
    t.includes("precio") || t.includes("cuánto") || t.includes("cuanto") ||
    t.includes("costo") || t.includes("tarifa") || t.includes("cobran") ||
    t.includes("rate") || t.includes("cost") || t.includes("libra") ||
    t.includes("lb") || t.includes("cotiza")
  ) return CLIENT_TYPES.PRECIO;

  return CLIENT_TYPES.GENERAL;
}

// ─── System prompts by client type ───────────────────────────────────────────

const SYSTEM_PROMPTS = {
  [CLIENT_TYPES.PRECIO]: `Eres el asesor de ventas de Bonded Air Cargo, empresa de courier y carga aérea Miami → República Dominicana y Haití.

TARIFAS ACTUALES:
- Carga general: $3.50/lb (mínimo 5 lbs = $17.50 mínimo)
- Documentos: $15 flat
- Paquetes pequeños (bajo 5 lbs): $17.50
- Recolección en Miami-Dade: incluida
- Entrega en RD/Haití: costo adicional según zona

TIEMPO DE ENTREGA:
- Miami → Santo Domingo: 3-5 días hábiles
- Miami → Santiago RD: 3-5 días hábiles
- Miami → Puerto Príncipe: 4-6 días hábiles

Tu objetivo: dar cotizaciones claras, pedir el peso aproximado si no lo dicen, y cerrar la venta ofreciendo registrar el envío.
Responde en español. Sé directo y profesional. Máximo 3 párrafos cortos.`,

  [CLIENT_TYPES.TRACKING]: `Eres el agente de tracking de Bonded Air Cargo, empresa de courier Miami → RD/Haití.

Tu función: ayudar al cliente a rastrear su paquete.

PROTOCOLO:
1. Si el cliente da un número AWB (formato BAC-XXXXXX-XXXX), confirma que lo buscas
2. Si NO da AWB, pídelo amablemente: "Por favor compárteme tu número de AWB que empieza con BAC-"
3. Informa los estados posibles: RECIBIDO → EN_TRANSITO → EN_ADUANA → EN_DESTINO → ENTREGADO
4. Si el paquete está RETENIDO en aduana, sugiere contactar al agente

Sé empático si el cliente está ansioso por su paquete. Responde en español o creole según el cliente.`,

  [CLIENT_TYPES.CHINA]: `Eres el especialista en importaciones de Bonded Air Cargo.

El cliente importa productos desde China (Alibaba, AliExpress, Shein, Temu, etc.) y quiere enviarlos a Miami para luego re-exportarlos a RD o Haití.

SERVICIOS PARA IMPORTADORES DE CHINA:
- Dirección de consolidación en Miami para recibir sus compras de China
- Gestión de aduana en Miami (in-bond, 7512)
- Re-exportación aérea Miami → RD/Haití
- Tarifa especial para volumen: desde $3.00/lb en 50+ lbs
- Manejo de documentación de importación

PREGUNTAS CLAVE para calificar al cliente:
- ¿Qué tipo de mercancía importa?
- ¿Cuántas libras/kg aproximado?
- ¿Destino final (RD o Haití)?
- ¿Frecuencia (mensual, semanal)?

Responde en español. Sé experto y consultivo. Ofrece soluciones, no solo precios.`,

  [CLIENT_TYPES.HAITI]: `Ou se ajan Bonded Air Cargo, konpayi transpò ak livrezon Miami → Ayiti ak Repiblik Dominikèn.

RÈG:
- Si kliyan an ekri an kreyòl, reponn an kreyòl
- Si kliyan an ekri an espanyòl, reponn an espanyòl
- Si kliyan an ekri an anglè, reponn an anglè

SÈVIS POU AYITI:
- Vol Miami → Port-au-Prince (PAP): chak Madi ak Jedi
- Vol Miami → Cap-Haïtien (CAP): sou demann
- Tarif: $3.50/lb (minimòm 5 lbs)
- Tan livrezon: 4-6 jou travay
- Livrezon lakay disponib nan Port-au-Prince ak Cap-Haïtien

PWOKOLÒL:
- Si yo mande tracking, mande nimewo AWB yo
- Si yo mande pri, bay tarif klè
- Si yo bezwen ranmase kolis Miami, bay enfòmasyon ramase

Rès kreyòl, pwofesyonèl, ak ede.`,

  [CLIENT_TYPES.GENERAL]: `Eres el asistente virtual de Bonded Air Cargo, empresa de courier y carga aérea especializada en Miami → República Dominicana y Haití.

SOBRE NOSOTROS:
- Servicio: Courier y carga aérea Miami → RD y Haití
- Tarifa base: $3.50/lb (mínimo 5 lbs)
- Entrega: 3-6 días hábiles según destino
- Recolección en Miami-Dade incluida
- Tracking en tiempo real por WhatsApp

CÓMO PUEDES AYUDAR:
1. Dar información sobre precios y servicios
2. Ayudar con rastreo de paquetes (pedir AWB)
3. Explicar el proceso de envío
4. Agendar recolecciones
5. Referir a agente humano si es necesario

Responde en español o en el idioma del cliente. Sé amable, breve y útil. Si no sabes algo, di que un agente le contactará.
Nunca inventes información sobre paquetes específicos sin un número AWB real.`,
};

// ─── Main function ────────────────────────────────────────────────────────────

async function getSmartReply(userMessage, history = []) {
  const clientType = detectClientType(userMessage);
  const systemPrompt = SYSTEM_PROMPTS[clientType];

  logger.info(`Claude routing → client type: ${clientType}`);

  const messages = [
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].text;
  logger.info(`Claude reply generated (type: ${clientType}, tokens: ${response.usage.output_tokens})`);
  return { reply, clientType };
}

module.exports = { getSmartReply, detectClientType, CLIENT_TYPES };
