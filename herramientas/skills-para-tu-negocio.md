# Skills para el Negocio — Bonded Air Cargo

Skills seguros específicos para carga aérea / courier / logística / aduana / operaciones.
Orden de utilidad real. Color = seguridad (🟢 seguro · 🟡 revisar antes).

> Recordatorio: un skill es texto (instrucciones), pero *puede* traer scripts. De autor
> conocido/oficial = confía; de autor nicho/desconocido = que se revise antes de instalar.

---

## 🟢 1. Operaciones de negocio — OFICIAL Anthropic
**`anthropics/knowledge-work-plugins`** (carpeta `small-business`) — 44 skills de finanzas,
ventas, operaciones, marketing, contratación. Cada skill pide OK antes de actuar.
**Buena parte ya está cargada en la sesión** (skills `small-business:*`).

## 🟢 2. Facturación y cobros — `Ootto-AI/claude-invoice-skills` (MIT)
Perseguir pagos vencidos, cotizaciones, categorizar gastos, leer flujo de caja.
```
npx skills add Ootto-AI/claude-invoice-skills -a claude-code
```
(Empresa que vende su producto; los skills gratis son la versión manual. Verificar README.)

## 🟢 3. Soporte / triage de clientes — `composio-community/support-skills`
Triage de tickets, SLA, sentimiento, búsqueda de cliente, borrador de respuesta.
Ideal para analizar/clasificar el volumen de WhatsApp (no para auto-responder).
```
npx skills add composio-community/support-skills -a claude-code
```

## 🟡 4. Logística / aduana — "Ship – Logistics Intelligence" (dvcrn)
Tarifas de carrier, documentación aduanera (HS codes, Incoterms), 3PL, claims.
Nicho → revisar antes de instalar.

## 🟡 5. Incidencias de carga — `logistics-exception-management`
Retrasos, daños, pérdidas, disputas con carrier. (De la colección everything-claude-code.)
Nicho → revisar antes de instalar.

---

## Colecciones corporativas grandes (🟢 skills, elegir, no instalar todo)
- `w95/awesome-claude-corporate-skills` — 166 skills por rol (finanzas, ventas, ops, soporte).
- `OneWave-AI/claude-skills` — 200+ skills (incluye small-business, flujo de caja).

## Avisos
- Los de logística/aduana (🟡) son de autores pequeños: pedir revisión antes de instalar.
- Su contenido aduanero es **genérico**: borrador útil, NO reemplaza a un agente aduanal
  con licencia.
