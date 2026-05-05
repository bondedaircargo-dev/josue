#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# VORTEX GROUP — Setup Wizard
# Uso: bash scripts/setup.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✓${RESET} $1"; }
warn() { echo -e "${YELLOW}  ⚠${RESET} $1"; }
ask()  { echo -e "${CYAN}  ?${RESET} $1"; }
info() { echo -e "${CYAN}  ℹ${RESET} $1"; }
step() { echo -e "\n${BOLD}${CYAN}── $1 ──────────────────────────────────────────${RESET}"; }

echo ""
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  VORTEX GROUP — AI Operations System v3.0${RESET}"
echo -e "${BOLD}  Setup Wizard${RESET}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}"
echo ""

# ── Verificar Node.js ──────────────────────────────────────────────────────────
step "1. Verificando Node.js"
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  ok "Node.js $NODE_VER encontrado"
else
  echo -e "${RED}  ✗ Node.js no instalado.${RESET}"
  echo "  Instala Node.js 18+ desde: https://nodejs.org"
  exit 1
fi

# ── Crear .env ─────────────────────────────────────────────────────────────────
step "2. Configuración de variables de entorno"

if [ -f ".env" ]; then
  warn ".env ya existe. ¿Sobreescribir? (s/N)"
  read -r OVERWRITE
  if [[ "$OVERWRITE" != "s" && "$OVERWRITE" != "S" ]]; then
    info "Manteniendo .env existente."
  else
    cp .env.example .env
    ok ".env creado desde .env.example"
  fi
else
  cp .env.example .env
  ok ".env creado desde .env.example"
fi

echo ""
info "Vamos a configurar las variables principales."
info "Presiona ENTER para dejar el valor por defecto (entre [corchetes])."
echo ""

# Helper para leer y escribir en .env
set_env() {
  local KEY="$1"
  local PROMPT="$2"
  local DEFAULT="$3"
  local SECRET="$4"

  if [ "$SECRET" = "true" ]; then
    ask "$PROMPT [${DEFAULT:-deja vacío por ahora}]:"
    read -rs VALUE
    echo ""
  else
    ask "$PROMPT [${DEFAULT:-deja vacío por ahora}]:"
    read -r VALUE
  fi

  VALUE="${VALUE:-$DEFAULT}"
  if [ -n "$VALUE" ]; then
    # Escape slashes and ampersands for sed
    ESCAPED=$(printf '%s\n' "$VALUE" | sed 's/[\/&]/\\&/g')
    if grep -q "^${KEY}=" .env 2>/dev/null; then
      sed -i "s/^${KEY}=.*/${KEY}=${ESCAPED}/" .env
    else
      echo "${KEY}=${VALUE}" >> .env
    fi
    ok "$KEY configurado"
  else
    warn "$KEY dejado vacío (puedes configurarlo luego en .env)"
  fi
}

# WhatsApp
echo -e "\n${BOLD}  📱 WhatsApp Business Cloud API${RESET}"
info "Obtén estos datos en: developers.facebook.com → Tu App → WhatsApp → API Setup"
set_env "PHONE_NUMBER_ID"   "Phone Number ID de WhatsApp" ""
set_env "WHATSAPP_TOKEN"    "Token de WhatsApp (EAAxxxxx...)" "" "true"
set_env "VERIFY_TOKEN"      "Verify token (inventas tú, ej: vortex2026)" "vortex2026"

# Claude AI
echo -e "\n${BOLD}  🧠 Claude AI (Anthropic)${RESET}"
info "Obtén tu API key en: console.anthropic.com → API Keys"
set_env "ANTHROPIC_API_KEY" "Anthropic API Key (sk-ant-...)" "" "true"

# Gmail
echo -e "\n${BOLD}  📧 Gmail${RESET}"
info "App Password en: myaccount.google.com/apppasswords"
set_env "GMAIL_USER"         "Tu email de Gmail" ""
set_env "GMAIL_APP_PASSWORD" "App Password de Gmail (16 chars)" "" "true"

# Pagos
echo -e "\n${BOLD}  💳 Pagos${RESET}"
set_env "PAYMENT_ZELLE"    "Cuenta Zelle" ""
set_env "PAYMENT_CASH_APP" "Cash App tag (ej: \$vortex)" ""

# DB opcional
echo -e "\n${BOLD}  🗄️  Base de datos (opcional)${RESET}"
info "Sin DATABASE_URL los datos viven en memoria (se borran al reiniciar)"
info "Supabase gratis en: supabase.com — copia la Connection String"
set_env "DATABASE_URL" "PostgreSQL URL (postgresql://user:pass@host/db)" ""

# ── Instalar dependencias ──────────────────────────────────────────────────────
step "3. Instalando dependencias"
npm install
ok "node_modules instalado"

# ── Crear carpeta de logs ──────────────────────────────────────────────────────
step "4. Preparando directorios"
mkdir -p logs
ok "Carpeta logs/ creada"

# ── Verificar entorno ──────────────────────────────────────────────────────────
step "5. Verificando configuración"
node scripts/check-env.js || true

# ── Resumen final ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  ✓ Setup completado${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}"
echo ""
echo "  Para arrancar el sistema:"
echo ""
echo -e "  ${CYAN}npm run dev${RESET}          — Desarrollo (con auto-reload)"
echo -e "  ${CYAN}npm start${RESET}            — Producción local"
echo -e "  ${CYAN}docker compose up -d${RESET} — Todo en Docker (app + n8n + postgres)"
echo ""
echo "  Dashboard:  http://localhost:3000/dashboard"
echo "  Health:     http://localhost:3000/dashboard/health"
echo "  Webhook WA: POST http://localhost:3000/webhook"
echo ""
info "Para exponer al internet (Meta necesita URL pública):"
echo -e "  ${CYAN}npx ngrok http 3000${RESET}"
echo ""
