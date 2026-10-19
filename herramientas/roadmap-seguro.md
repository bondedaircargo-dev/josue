# Roadmap de Herramientas Seguras — Bonded Air Cargo

Lista para mejorar el sistema **sin comprometer cuentas ni filtrar datos personales**.
Instalar por niveles, de más seguro a revisar.

> **Nota sobre "likes":** GitHub usa **estrellas (stars)**, no likes. El repo más popular
> del mundo tiene ~400 mil, no millones. **Popularidad ≠ seguridad.** Juzga por *cómo se
> conecta la herramienta*, no por su fama.

---

## 🚦 Regla de oro

| Color | Cómo se conecta | ¿Instalar? |
|---|---|---|
| 🟢 Verde | API **oficial** + tus propias llaves/OAuth, self-hosted, open source, revocable | Sí |
| 🟡 Amarillo | Open source que tú alojas pero toca datos sensibles | Sí, pero revisar el código |
| 🔴 Rojo | Pide tu **usuario/contraseña personal**, "raspa" (scrape), bot "gratis" en nube ajena, o manda acciones masivas desde tu cuenta | **No — robo de datos / baneo** |

**Prueba rápida:** ¿usa API oficial con MIS llaves, o me pide mi login personal?
Lo primero es seguro; lo segundo es rojo.

---

## WhatsApp

- 🟢 **Mantener: WhatsApp Business Cloud API (oficial, ya instalado).** Camino legal, sin
  riesgo de baneo. Mejora pendiente: registrar **plantillas oficiales** en Meta para
  mensajes proactivos (ya está en el README como próximo paso).
- 🔴 **Evitar: `whatsapp-web.js` y `Baileys`.** No oficiales. El uso de difusión/marketing
  es justo el patrón que más banea WhatsApp. Te pueden tumbar el número.

---

## Lista por niveles

### Nivel 1 — Ya lo tienes, solo úsalo (🟢 cero riesgo, cero instalación)
1. **Meta Ads oficial** (Facebook/Instagram) — ya conectado en el repo.
2. **Gmail / Google Drive / Calendar** — oficiales.
3. **QuickBooks** — oficial, contabilidad.
4. **Skills de marketing ya cargadas** — campañas, SEO, secuencias de email, contenido redes.

### Nivel 2 — GitHub seguro, self-host con TUS llaves (🟢)
5. **n8n** — ya lo usas; es el cerebro que conecta todo. Aquí conviene invertir.
6. **MCP de Google Ads + Meta Ads + GA4** (~2k ⭐) — APIs oficiales con tus tokens.

### Nivel 3 — Útil pero revisar antes (🟡)
7. **"Open-source marketing agents"** (~591 ⭐) — OK *si* conecta por APIs oficiales y tus
   llaves. Revisar qué integra antes de instalar.

### Prohibidos (🔴)
- `whatsapp-web.js` / `Baileys`
- Scrapers de Instagram / Facebook / LinkedIn personales
- Paneles "gratis" en la nube que piden loguear tus redes

---

## Checklist antes de instalar CUALQUIER cosa

- [ ] ¿Usa API oficial (no mi contraseña personal)?
- [ ] ¿Se instala en MI servidor / MI máquina (self-hosted)?
- [ ] ¿Es open source y puedo (o alguien puede) leer el código?
- [ ] ¿Puedo revocar el acceso cuando quiera?
- [ ] ¿NO manda acciones masivas automáticas desde mi cuenta?

Si alguna respuesta es "no" → pregúntame antes de instalar.
