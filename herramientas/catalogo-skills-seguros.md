# Catálogo de Skills Seguros para Claude — Bonded Air Cargo

Skills verificados y seguros para instalar, ordenados por confianza.

> **Qué es un skill:** un archivo de **instrucciones** (texto) que le enseña a Claude a
> hacer una tarea. Es 🟢 **lo más seguro** que puedes instalar (no es un scraper, no toca
> tus cuentas). **Matiz:** un skill *puede* traer scripts adjuntos, así que:
> - De **Anthropic o autores conocidos** → confía.
> - De **autor desconocido** → que se revise el código antes de instalar.
> - Nunca conectes tus cuentas personales a "partners" recomendados dentro de un skill.

---

## 🏆 Tier 0 — Oficial de Anthropic (máxima confianza) 🟢

**`anthropics/skills`** — ~182k ⭐ · Apache 2.0 (los de documentos son "source-available").
Repo oficial de los creadores de Claude.
- **Documentos:** Word (docx), PDF, PowerPoint (pptx), Excel (xlsx) — +600k instalaciones.
- **Creativo/diseño:** arte, música, diseño.
- **Empresa/comunicación:** comunicaciones, branding.
- **Técnico:** generación de servidores MCP, pruebas de web apps.

Instalar:
```
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```
Otros repos oficiales: `anthropics/knowledge-work-plugins`, `anthropics/claude-plugins-official`.

## 🥇 Tier 1 — Marketing (gran reputación) 🟢

**`coreyhaines31/marketingskills`** — ~55k ⭐ · MIT. 52 skills: CRO, copy, SEO, ads,
analytics, growth, ventas. El más popular en marketing.
```
npx skills add coreyhaines31/marketingskills -a claude-code
```
Opcional del repo (connexión de cuentas / partners pagados): **saltar.**

## 📚 Tier 2 — Colecciones grandes (🟢 skills, revisar autor)

- **`OpenClaudia/openclaudia-skills`** — 77 skills de marketing (SEO, contenido, email, ads).
- **`VoltAgent/awesome-agent-skills`** — catálogo de +1000 skills para explorar y escoger.

---

## ✅ Ya cargado en la sesión (no hay que instalar)

- Skills **oficiales de Anthropic**: PDF, Word, PowerPoint, Excel, diseño, skill-creator.
- **~35 skills de marketing** (ads, redes) y **+130 skills de redes sociales**.
- Plugins de small-business, operaciones, finanzas (QuickBooks), diseño, RR. HH.

## 🔴 Lo que NO es "skill" y sí tiene riesgo (recordatorio)

- Scrapers de WhatsApp (`whatsapp-web.js`, `Baileys`) → banean el número.
- Scrapers de Instagram / Facebook / LinkedIn personales.
- MCP/paneles "gratis" en nube ajena que piden loguear tus redes.

Ver `herramientas/roadmap-seguro.md` para el semáforo completo.
