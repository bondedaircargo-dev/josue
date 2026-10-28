# Cómo poner el sistema en línea (montaje)

Guía simple para dejar corriendo el sistema de Bonded Air Cargo en internet.
Una vez montado, funciona solo: guarda cada contacto/mensaje de WhatsApp en tu
Google Sheet, contesta automático y genera reportes.

---

## Paso 0 — Lo que vas a necesitar (ten esto a mano)

**Mínimo para que guarde contactos y conteste WhatsApp:**

| Dato | De dónde sale |
|---|---|
| `WHATSAPP_TOKEN` | Meta → Tu App → WhatsApp → API Setup |
| `PHONE_NUMBER_ID` | Mismo lugar (WhatsApp → API Setup) |
| `VERIFY_TOKEN` | Lo inventas tú (ej. `bonded2026`). Debe ser igual en Meta y aquí. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud → Cuenta de servicio |
| `GOOGLE_PRIVATE_KEY` | Misma cuenta de servicio (clave JSON) |
| `GOOGLE_SHEET_MESSAGES_ID` | De la URL de tu hoja de Mensajes |
| `GOOGLE_SHEET_CUSTOMERS_ID` | De la URL de tu hoja de Clientes |

**Opcional (mejora las respuestas y agrega facturas/reportes):**
`ANTHROPIC_API_KEY`, `META_ADS_TOKEN`, `META_ADS_ACCOUNT_ID`, `GMAIL_USER`,
`GMAIL_APP_PASSWORD`, `GOOGLE_SHEET_SHIPMENTS_ID`, `GOOGLE_SHEET_LEADS_ID`.

> ⚠️ Importante para Google: después de crear la hoja, **compártela con el email
> de la cuenta de servicio** (el `GOOGLE_SERVICE_ACCOUNT_EMAIL`), con permiso de
> **Editor**. Si no la compartes, el sistema no puede escribir.

---

## Paso 1 — Subir a Railway (lo más fácil desde el celular)

1. Entra a [railway.app](https://railway.app) y entra con tu GitHub.
2. **New Project → Deploy from GitHub repo** → elige `bondedaircargo-dev/josue`.
3. Railway detecta Node solo y lo instala. No toques nada de config.

## Paso 2 — Poner las credenciales

1. En el proyecto de Railway → pestaña **Variables**.
2. Agrega cada variable del Paso 0 (nombre y valor).
   - Para `GOOGLE_PRIVATE_KEY`: pega la clave completa, con las `\n` incluidas,
     entre comillas, tal como está en el `.env.example`.
3. Railway vuelve a desplegar solo al guardar.

## Paso 3 — Conseguir tu dirección pública

1. En Railway → **Settings → Networking → Generate Domain**.
2. Te da una URL tipo `https://josue-production.up.railway.app`.
3. Pruébala: abre `https://TU-URL/reports/health` — si ves los servicios en
   `true`, quedó conectado. ✅

## Paso 4 — Conectar el webhook de WhatsApp en Meta

1. Meta → Tu App → WhatsApp → **Configuration → Webhook**.
2. **Callback URL:** `https://TU-URL/webhook`
3. **Verify Token:** el mismo `VERIFY_TOKEN` que pusiste en las variables.
4. Suscríbete al evento **messages** y guarda.

Desde ese momento, cada persona que te escriba por WhatsApp se guarda sola en tu
Google Sheet y el sistema contesta automático.

---

## Dónde ver que todo quedó bien

- `https://TU-URL/` → debe decir `"status": "running"`.
- `https://TU-URL/reports/health` → los servicios que conectaste salen en `true`.
- Escríbele un "hola" a tu WhatsApp de prueba → revisa que aparezca la fila en tu
  hoja de Mensajes.
