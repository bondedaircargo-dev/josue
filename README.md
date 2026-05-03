# Bonded Air Cargo — Sistema de Automatización Logística

**Miami → República Dominicana / Haití**

Sistema completo de automatización para courier y carga aérea. Incluye WhatsApp Business, Meta Ads, tracking AWB, facturas PDF, Google Sheets, Gmail y n8n workflows.

---

## Arquitectura del Sistema

```
josue/
├── index.js                          # Entry point del servidor
├── .env.example                      # Variables de entorno requeridas
├── src/
│   ├── webhook/
│   │   └── whatsapp.js               # Webhook WhatsApp Cloud API
│   ├── services/
│   │   ├── whatsapp.js               # Envío de mensajes WA
│   │   ├── metaAds.js                # Meta Ads API (campañas, leads, insights)
│   │   ├── gmail.js                  # Envío de emails con Nodemailer
│   │   ├── sheets.js                 # Google Sheets (log envíos, clientes)
│   │   ├── pdf.js                    # Generación de PDFs (facturas, AWB, pre-alertas)
│   │   └── claude.js                 # IA Claude para respuestas inteligentes
│   ├── routes/
│   │   ├── tracking.js               # CRUD de envíos / AWB
│   │   ├── customers.js              # CRM básico + broadcast
│   │   ├── invoices.js               # Facturas (crear, PDF, enviar por email)
│   │   ├── campaigns.js              # Meta Ads + leads webhook
│   │   └── reports.js                # Reportes y health check
│   ├── templates/
│   │   └── messages/index.js         # Templates de mensajes WhatsApp
│   └── utils/
│       ├── logger.js                 # Logger con timestamps
│       └── helpers.js                # Generador de AWB, facturas, helpers
└── n8n/
    └── workflows/
        ├── whatsapp-incoming.json    # Workflow: mensajes entrantes WA
        ├── meta-ads-lead-followup.json  # Workflow: follow-up automático de leads
        └── tracking-alert.json       # Workflow: alertas de estado de envío
```

---

## API Keys que necesitas

| Servicio | Dónde obtenerla | Variable .env |
|---|---|---|
| WhatsApp Cloud API | [developers.facebook.com](https://developers.facebook.com) > App > WhatsApp | `WHATSAPP_TOKEN` |
| Phone Number ID | Meta App > WhatsApp > API Setup | `WHATSAPP_PHONE_NUMBER_ID` |
| Meta Ads Token | Meta Business > System Users | `META_ADS_TOKEN` |
| Meta Ad Account ID | business.facebook.com > Ad Accounts | `META_ADS_ACCOUNT_ID` |
| Claude AI | [console.anthropic.com](https://console.anthropic.com) | `ANTHROPIC_API_KEY` |
| Gmail App Password | myaccount.google.com/apppasswords | `GMAIL_APP_PASSWORD` |
| Google Service Account | console.cloud.google.com | `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` |
| Google Sheet IDs | URL de cada hoja: `spreadsheets/d/[ID]/edit` | `GOOGLE_SHEET_*_ID` |

---

## Instalación

```bash
# 1. Clonar repo
git clone https://github.com/bondedaircargo-dev/josue.git
cd josue

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales reales

# 4. Iniciar servidor
npm start         # producción
npm run dev       # desarrollo (auto-reload)
```

---

## Configurar WhatsApp Cloud API

### Paso 1: Crear App en Meta

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear nueva App > Tipo: Business
3. Añadir producto: WhatsApp
4. Ir a **WhatsApp > API Setup**
5. Copiar:
   - `Access Token` → `WHATSAPP_TOKEN`
   - `Phone number ID` → `WHATSAPP_PHONE_NUMBER_ID`

### Paso 2: Exponer tu servidor públicamente

```bash
# Opción A: ngrok (desarrollo)
npx ngrok http 3000
# Copia la URL https://xxxxx.ngrok.io

# Opción B: Railway / Render / VPS (producción)
# Deploy y usa tu dominio real
```

### Paso 3: Configurar webhook en Meta

1. Meta App > WhatsApp > Configuration > Webhook
2. **Callback URL:** `https://tu-dominio.com/webhook`
3. **Verify Token:** el mismo valor que pusiste en `WEBHOOK_VERIFY_TOKEN`
4. Suscribir al evento: `messages`
5. Guardar y verificar

---

## Configurar Meta Ads API

1. Ir a [business.facebook.com](https://business.facebook.com)
2. Configuración del negocio > Usuarios del sistema
3. Crear **System User** con rol Admin
4. Generar token con permisos: `ads_management`, `ads_read`, `leads_retrieval`
5. Copiar token → `META_ADS_TOKEN`
6. Copiar Ad Account ID → `META_ADS_ACCOUNT_ID`

### Configurar webhook para leads

En Meta App > Products > Webhooks:
- URL: `https://tu-dominio.com/campaigns/leads/notify`
- Suscribir a: `leadgen`

---

## Configurar n8n

```bash
# Instalar n8n
npm install -g n8n

# Iniciar n8n
n8n start
# Acceder en: http://localhost:5678

# Importar workflows
# n8n UI > Import > subir archivos de n8n/workflows/*.json
```

**Variables de entorno en n8n:**
Configurar en n8n UI > Settings > Environment Variables:
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `META_ADS_TOKEN`
- `GOOGLE_SHEET_*_ID`

---

## Configurar Google Sheets

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto > Activar **Google Sheets API**
3. IAM > Service Accounts > Crear cuenta de servicio
4. Generar clave JSON → copiar `client_email` y `private_key` al `.env`
5. Compartir cada Google Sheet con el email de la Service Account (rol Editor)

**Hojas recomendadas:**

| Hoja | Variable | Columnas |
|---|---|---|
| Envíos | `GOOGLE_SHEET_SHIPMENTS_ID` | AWB, Cliente, Teléfono, Origen, Destino, Peso, Piezas, Descripción, Estado, Factura, Valor, Fecha |
| Clientes | `GOOGLE_SHEET_CUSTOMERS_ID` | Nombre, Teléfono, Email, Dirección, País, Fecha |
| Leads | `GOOGLE_SHEET_LEADS_ID` | Fecha, Lead ID, Nombre, Teléfono, Email, Fuente, Estado |

---

## Endpoints de la API

### WhatsApp Webhook
```
GET  /webhook          Meta handshake verification
POST /webhook          Receive incoming messages
```

### Tracking / AWB
```
POST   /tracking                    Crear nuevo envío
GET    /tracking                    Listar todos los envíos
GET    /tracking/:awb               Consultar estado por AWB
PATCH  /tracking/:awb/status        Actualizar estado (notifica cliente)
GET    /tracking/:awb/prealert      Descargar pre-alerta PDF
GET    /tracking/report/pdf         Reporte completo AWB PDF
```

### Clientes / CRM
```
POST   /customers                   Registrar cliente
GET    /customers                   Listar clientes
GET    /customers/:phone            Buscar cliente por teléfono
PATCH  /customers/:phone            Actualizar cliente
POST   /customers/:phone/message    Enviar mensaje WhatsApp
POST   /customers/broadcast         Enviar mensaje a múltiples clientes
```

### Facturas
```
POST   /invoices                    Crear factura
GET    /invoices                    Listar facturas
GET    /invoices/:number            Ver factura
GET    /invoices/:number/pdf        Descargar factura PDF
POST   /invoices/:number/send       Enviar factura por email
PATCH  /invoices/:number/paid       Marcar como pagada
```

### Meta Ads / Campañas
```
GET    /campaigns/insights          Métricas de la cuenta
GET    /campaigns/list              Listar campañas activas
POST   /campaigns                   Crear campaña
GET    /campaigns/leads/:formId     Ver leads de un formulario
POST   /campaigns/leads/notify      Webhook para leads nuevos
```

### Reportes
```
GET    /reports/health              Estado de servicios conectados
GET    /reports/awb                 Reporte AWB PDF
GET    /reports/ads                 Reporte Meta Ads
```

---

## Flujo de Automatización

```
Cliente escribe en WhatsApp
         │
         ▼
Webhook POST /webhook
         │
         ├── Palabra clave → Respuesta rápida (template)
         │
         └── Mensaje libre → Claude AI (respuesta inteligente)
                  │
                  └── Responde en español o creole según idioma del cliente

Nuevo lead de Meta Ads
         │
         ▼
Webhook POST /campaigns/leads/notify
         │
         ├── Extrae nombre y teléfono
         └── Envía WhatsApp de bienvenida automático

Actualización de estado de envío
         │
         ▼
PATCH /tracking/:awb/status
         │
         ├── Notifica cliente por WhatsApp
         ├── Envía email (si tiene email registrado)
         └── Registra en Google Sheets
```

---

## Estados de Envío

| Estado | Significado |
|---|---|
| `RECIBIDO` | Paquete recibido en Miami |
| `EN_TRANSITO` | En vuelo |
| `EN_ADUANA` | Procesando en aduana destino |
| `EN_DESTINO` | Llegó al destino, pendiente entrega |
| `ENTREGADO` | Entregado al cliente |
| `RETENIDO` | Retenido en aduana |

---

## Respuestas Automáticas de WhatsApp

| Palabra clave | Respuesta |
|---|---|
| hola / hello / bonswa | Menú de bienvenida con opciones |
| 1 / rastrear / tracking | Solicita número AWB |
| 2 / precio / tarifa / costo | Tabla de precios |
| 3 / tiempo / cuando llega | Tiempos de entrega por destino |
| 4 / recolección / pickup | Info para agendar recolección |
| agente / humano / persona | Transfiere a agente humano |
| gracias / mèsi | Despedida |
| (cualquier otro) | Claude AI responde inteligentemente |

---

## Próximos Pasos Recomendados

1. **Base de datos**: Reemplazar almacenamiento en memoria (`Map`) con PostgreSQL o MongoDB
2. **Autenticación API**: Añadir JWT o API key a los endpoints internos
3. **Cola de mensajes**: Redis + Bull para manejo de envíos masivos de WhatsApp
4. **Templates oficiales de WhatsApp**: Registrar templates en Meta para envíos proactivos
5. **Dashboard web**: Panel de control para gestionar envíos, clientes y campañas
6. **Formulario 7512 / In-Bond**: Módulo específico para documentación aduanera USA
7. **Multi-agente**: Sistema para asignar conversaciones a agentes humanos

---

## Soporte

Para problemas con la API de Meta: [developers.facebook.com/support](https://developers.facebook.com/support)
Para n8n: [docs.n8n.io](https://docs.n8n.io)
Para Claude AI: [docs.anthropic.com](https://docs.anthropic.com)
