# Analizar WhatsApp Completo — Bonded Air Cargo

Objetivo: que Claude **analice** las conversaciones de WhatsApp (clientes, leads,
patrones). **No** para escribir ni responder automático — solo análisis.

> **Clave:** la forma segura de "WhatsApp completo" es la **exportación de chats** de la
> app (botón oficial de WhatsApp). La Cloud API solo ve mensajes *de aquí en adelante*,
> no el historial pasado. Exportar = 🟢 cero riesgo, cero instalación, no banea el número.
> Nada de scrapers (`whatsapp-web.js` / `Baileys` = 🔴).

---

## Fuente 1 — Historial completo (exportar chats) 🟢

1. En el teléfono, abre un chat o grupo → menú **⋮** → **Más** → **Exportar chat**.
2. Elige **"Sin archivos"** (más rápido y liviano) → se genera un `.txt`.
3. Repite con los chats de clientes y leads importantes.
4. Sube los `.txt` a Claude. Si son muchos, en **tandas (batches)** de 10–20.

## Fuente 2 — En vivo (ya existe en el sistema) 🟢

- El WhatsApp Business Cloud API recibe mensajes por webhook y los guarda en el
  Google Sheet `GOOGLE_SHEET_MESSAGES_ID`. Cuando esté poblado, Claude lo analiza
  directo desde ahí.

---

## Qué entrega el análisis

1. **Clientes top** — quién escribe/compra más; recurrentes vs nuevos.
2. **Preguntas frecuentes (FAQ real)** — para afinar respuestas automáticas y plantillas.
3. **Leads perdidos** — preguntaron precio y no cerraron; mensajes sin responder.
4. **Tiempos de respuesta** — velocidad de atención y dónde se escapan clientes.
5. **Horas y días pico** — cuándo entra más volumen.
6. **Idioma por cliente** — español / créole / francés (para enrutar).
7. **Temas y rutas** — precio, tracking, quejas, aduana; RD vs Haití.
8. **Clientes en riesgo** — molestos o fríos, para rescatarlos.
9. **Oportunidades de venta** — con nombre y teléfono.

---

## Seguridad

- Solo lectura y análisis. No se publica ni responde nada automático.
- No se instala ningún programa; los chats los exportas tú desde la app.
- Los `.txt` son datos tuyos; manéjalos como información sensible de clientes.
