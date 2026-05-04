// 12-category message classifier + language detector for logistics operations
// Categories map to all operational intents in the Vortex Group system

const CATEGORIES = {
  TRACKING: "tracking",
  COTIZACION: "cotizacion",
  QUEJA: "queja",
  RECLAMACION: "reclamacion",
  FRANQUICIA: "franquicia",
  PAGO: "pago",
  FACTURA: "factura",
  PREALERTA: "prealerta",
  AWB_INVOICE: "awb_invoice",
  CLIENTE_GRANDE: "cliente_grande",
  AGENTE: "agente",
  OPERACION: "operacion",
};

const CLASSIFICATION_RULES = [
  {
    category: CATEGORIES.AGENTE,
    keywords: [
      "hablar con", "agente humano", "persona real", "operador", "supervisor",
      "speak to", "human agent", "human", "manager", "escalar", "escalate",
      "necesito hablar", "quiero hablar",
    ],
  },
  {
    category: CATEGORIES.RECLAMACION,
    keywords: [
      "reclamo", "reclamacion", "reclamación", "perdido", "perdido el paquete",
      "dañado", "dañada", "roto", "rota", "cobro incorrecto", "cobro mal",
      "entrega fallida", "no llegó", "no llego", "desapareció", "desaparecio",
      "claim", "damaged", "lost package", "pakèt pèdi", "kraze", "pèdi",
    ],
  },
  {
    category: CATEGORIES.QUEJA,
    keywords: [
      "queja", "molesto", "molesta", "enojado", "enojada", "mal servicio",
      "pésimo", "pesimo", "horrible", "terrible", "disgusto", "decepcionado",
      "incumplimiento", "complaint", "bad service", "muy malo",
    ],
  },
  {
    category: CATEGORIES.FRANQUICIA,
    keywords: [
      "franquicia", "franchise", "punto de envio", "punto de envío",
      "abrir punto", "agente autorizado", "representante", "distribuidor",
      "invertir", "comisiones", "socio", "asociado", "franchisor",
      "oportunidad de negocio", "ser agente",
    ],
  },
  {
    category: CATEGORIES.CLIENTE_GRANDE,
    keywords: [
      "contenedor", "container", "tonelada", "flete", "paleta", "pallet",
      "volumen", "carga masiva", "bulk", "wholesale", "mayorista",
      "importador", "exportador", "corporativo", "empresa grande",
      "contrato", "account", "cuenta corporativa",
    ],
  },
  {
    category: CATEGORIES.PREALERTA,
    keywords: [
      "prealerta", "pre-alerta", "prealert", "pre-alert",
      "voy a enviar", "voy a mandar", "alertar aduana",
      "notificar", "avisar que viene",
    ],
  },
  {
    category: CATEGORIES.AWB_INVOICE,
    keywords: [
      "air waybill", "guía aérea", "numero de guia", "invoice comercial",
      "factura comercial", "packing list", "bill of lading", "manifiesto",
      "documentos de carga", "documentos de importacion",
    ],
  },
  {
    category: CATEGORIES.TRACKING,
    keywords: [
      "rastrear", "tracking", "awb", "crn-", "donde está", "donde esta",
      "mi paquete", "llegó", "llego", "entregado", "estado del paquete",
      "seguimiento", "sigo", "track", "kote kolis mwen", "suivi",
      "status del envio", "bac-",
    ],
  },
  {
    category: CATEGORIES.PAGO,
    keywords: [
      "pagar", "pago", "payment", "transferir", "zelle", "cash app",
      "paypal", "tarjeta", "efectivo", "cuanto debo", "saldo pendiente",
      "deuda", "balance", "peman", "peye", "how to pay",
    ],
  },
  {
    category: CATEGORIES.FACTURA,
    keywords: [
      "factura", "recibo", "receipt", "comprobante", "estado de cuenta",
      "billing statement", "nota de credito", "nota de crédito",
      "necesito factura", "enviar factura",
    ],
  },
  {
    category: CATEGORIES.COTIZACION,
    keywords: [
      "precio", "cuanto", "cuánto", "costo", "tarifa", "cotizar", "cotizacion",
      "rate", "cost", "libra", "lb", "cobran", "cuanto cuesta", "how much",
      "konbyen", "pri", "tarifa por libra", "precio por libra",
    ],
  },
];

function classifyMessage(text) {
  const t = (text || "").toLowerCase();

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.keywords.some((kw) => t.includes(kw))) {
      return rule.category;
    }
  }

  return CATEGORIES.OPERACION;
}

// Detect language: es (Spanish) | en (English) | ht (Haitian Creole)
function detectLanguage(text) {
  const t = (text || "").toLowerCase();

  const kreyolMarkers = [
    "bonswa", "bonjou", "mèsi", "kote", "kolis", "peye", "peman",
    "pakèt", "ayiti", "sa ou vle", "ki jan", "tanpri", "mwen",
    "pèdi", "kraze", "suivi", "ou vle", "ban mwen",
  ];
  const englishMarkers = [
    "hello", " hi ", "how are", "where is", "my package", "how much",
    "i want", "please", "thank you", "thanks", "can you", "i need",
    "do you", "what is", "when will", "tracking number",
  ];

  if (kreyolMarkers.some((m) => t.includes(m))) return "ht";
  if (englishMarkers.some((m) => t.includes(m))) return "en";
  return "es";
}

// Priority level for routing (higher = more urgent)
const CATEGORY_PRIORITY = {
  [CATEGORIES.RECLAMACION]: 5,
  [CATEGORIES.QUEJA]: 4,
  [CATEGORIES.AGENTE]: 4,
  [CATEGORIES.CLIENTE_GRANDE]: 3,
  [CATEGORIES.PAGO]: 3,
  [CATEGORIES.TRACKING]: 2,
  [CATEGORIES.FRANQUICIA]: 2,
  [CATEGORIES.COTIZACION]: 2,
  [CATEGORIES.FACTURA]: 2,
  [CATEGORIES.PREALERTA]: 2,
  [CATEGORIES.AWB_INVOICE]: 2,
  [CATEGORIES.OPERACION]: 1,
};

function getCategoryPriority(category) {
  return CATEGORY_PRIORITY[category] || 1;
}

module.exports = { classifyMessage, detectLanguage, getCategoryPriority, CATEGORIES };
