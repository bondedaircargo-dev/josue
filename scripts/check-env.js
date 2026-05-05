#!/usr/bin/env node
// Validador de variables de entorno — se ejecuta antes de arrancar el servidor
// Si faltan vars críticas en producción, aborta el arranque con mensaje claro.

require("dotenv").config();

const { format } = require("date-fns");
const ts = () => format(new Date(), "yyyy-MM-dd HH:mm:ss");

const REQUIRED = [
  // Sin estas, el servidor no puede arrancar con nada útil
];

const RECOMMENDED = [
  { key: "WHATSAPP_TOKEN",    label: "WhatsApp Cloud API token",     docs: "developers.facebook.com" },
  { key: "PHONE_NUMBER_ID",   label: "WhatsApp Phone Number ID",     docs: "Meta → WhatsApp → API Setup" },
  { key: "VERIFY_TOKEN",      label: "Webhook verify token",          docs: "Inventas tú, ponlo igual en Meta" },
  { key: "ANTHROPIC_API_KEY", label: "Claude AI API key",            docs: "console.anthropic.com" },
  { key: "GMAIL_USER",        label: "Gmail (para emails)",           docs: "myaccount.google.com/apppasswords" },
  { key: "GMAIL_APP_PASSWORD",label: "Gmail App Password",            docs: "myaccount.google.com/apppasswords" },
  { key: "PAYMENT_ZELLE",     label: "Zelle para pagos",             docs: ".env → PAYMENT_ZELLE" },
];

const OPTIONAL = [
  { key: "DATABASE_URL",               label: "PostgreSQL / Supabase (persistencia)" },
  { key: "META_ADS_TOKEN",             label: "Meta Ads API (campañas)" },
  { key: "META_ADS_ACCOUNT_ID",        label: "Meta Ads Account ID" },
  { key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", label: "Google Sheets service account" },
  { key: "MCP_PHONE_NUMBER_ID",        label: "MCPack número de WhatsApp" },
  { key: "GPK_PHONE_NUMBER_ID",        label: "GoPack número de WhatsApp" },
  { key: "ONE_PHONE_NUMBER_ID",        label: "One Courier número de WhatsApp" },
  { key: "VTX_PHONE_NUMBER_ID",        label: "Vortex número de WhatsApp" },
];

const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";

function ok(msg)   { console.log(`${GREEN}  ✓${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}  ⚠${RESET} ${msg}`); }
function err(msg)  { console.log(`${RED}  ✗${RESET} ${msg}`); }
function info(msg) { console.log(`${CYAN}  ℹ${RESET} ${msg}`); }

console.log(`\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${BOLD}  VORTEX GROUP — Environment Check${RESET}  ${ts()}`);
console.log(`${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

// ── Required vars ─────────────────────────────────────────────────────────────
let fatal = 0;
for (const key of REQUIRED) {
  if (process.env[key]) { ok(key); }
  else { err(`${key} — REQUERIDO. El servidor no puede arrancar.`); fatal++; }
}

// ── Recommended vars ──────────────────────────────────────────────────────────
console.log(`\n  ${BOLD}Recomendadas:${RESET}`);
let missing = 0;
for (const { key, label, docs } of RECOMMENDED) {
  if (process.env[key]) { ok(`${key} (${label})`); }
  else { warn(`${key} no configurado — ${label}  ${CYAN}→ ${docs}${RESET}`); missing++; }
}

// ── Optional vars ─────────────────────────────────────────────────────────────
console.log(`\n  ${BOLD}Opcionales:${RESET}`);
for (const { key, label } of OPTIONAL) {
  if (process.env[key]) { ok(`${key} (${label})`); }
  else { info(`${key} no configurado — ${label}`); }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

if (fatal > 0) {
  console.log(`${RED}${BOLD}  ERROR: ${fatal} variable(s) requerida(s) faltante(s). Abortando.${RESET}`);
  console.log(`  Copia .env.example a .env y rellena los valores.\n`);
  process.exit(1);
}

if (missing > 0) {
  console.log(`${YELLOW}${BOLD}  AVISO: ${missing} variable(s) recomendada(s) no configurada(s).${RESET}`);
  console.log(`  El servidor arrancará pero algunos módulos estarán desactivados.`);
} else {
  console.log(`${GREEN}${BOLD}  Todo configurado correctamente. Arrancando...${RESET}`);
}

console.log(`${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
