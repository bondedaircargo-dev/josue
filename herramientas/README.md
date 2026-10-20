# Herramientas — Índice Maestro (Bonded Air Cargo)

Lista de skills y conectores (MCP) **gratis y seguros** para mejorar el sistema, por
función del negocio. Color: 🟢 seguro · 🟡 revisar antes · 🔴 no usar.

> **Regla de oro:** 🟢 = API oficial + TUS llaves/OAuth, self-hosted, autor conocido,
> acceso mínimo. 🔴 = pide tu login personal, "raspa" (scraper) o es un panel gratis en
> nube ajena. Detalle en `roadmap-seguro.md`.

---

## 📦 Tracking / envíos
| Repo | Nota | Color |
|---|---|---|
| `Scottcjn/package-tracker-mcp` | Sin API key; detecta carrier y da URL oficial | 🟢 |
| `pocharlies/mcp-17track` | 2900+ carriers; API key gratis de 17Track | 🟢 |
| `roscoej/ups-mcp` | UPS oficial, MIT; credenciales UPS | 🟢 |
| `trackmage/trackmage-mcp-server` | 1600+ carriers, OAuth (tercero) | 🟡 |

## 💰 Contabilidad / facturación
| Repo | Nota | Color |
|---|---|---|
| `intuit/quickbooks-online-mcp-server` | OFICIAL Intuit, MIT, 29 entidades + 11 reportes | 🟢 |
| `wyre-technology/qbo-mcp` | Apache-2.0, 130+ tools QBO | 🟢 |
*QuickBooks ya está conectado en la sesión (oficial).*

## 📊 Google Sheets / Workspace
| Repo | Nota | Color |
|---|---|---|
| `taylorwilsdon/google_workspace_mcp` | Gmail+Drive+Sheets+Calendar, MIT, OAuth | 🟢 |
| `freema/mcp-gsheets` | Solo Sheets, ligero | 🟢 |

## 📄 Documentos / OCR / aduana
| Herramienta | Nota | Color |
|---|---|---|
| Paperless-NGX | OCR de facturas, AWB, docs escaneados | 🟢 |
| Filesystem MCP (oficial) | Claude lee/organiza una carpeta designada | 🟢 |

## 🧰 Skills de negocio (instrucciones, no conectores)
| Repo | Para qué | Color |
|---|---|---|
| `anthropics/knowledge-work-plugins` (small-business) | 44 skills de operaciones, oficial | 🟢 |
| `Ootto-AI/claude-invoice-skills` | Cobros, cotizaciones, flujo de caja (MIT) | 🟢 |
| `composio-community/support-skills` | Triage de tickets/WhatsApp, sentimiento | 🟢 |
| `coreyhaines31/marketingskills` | 52 skills de marketing (MIT) | 🟢 |
| Ship / logistics-exception | Aduana, incidencias de carga (nicho) | 🟡 |

## 🔎 Directorios para explorar
- `tolkonepiu/best-of-mcp-servers` — 400 conectores rankeados, ~1.4M ⭐.
- `appcypher/awesome-mcp-servers`, `wong2/awesome-mcp-servers`.
- Skills oficiales: `anthropics/skills` (~182k ⭐).

---

## Documentos de esta carpeta
- `roadmap-seguro.md` — semáforo de seguridad y qué instalar/evitar.
- `catalogo-skills-seguros.md` — skills seguros (Anthropic + marketing).
- `skills-para-tu-negocio.md` — skills por función del negocio.
- `conectores-mcp-gratis.md` — conectores MCP gratis para el stack.
- `analizar-whatsapp.md` — cómo analizar WhatsApp completo.
- `../linkedin/` — prospección y MCP de LinkedIn (solo lectura).

## Nota sobre "gratis"
- Tracking: detectar carrier es gratis; el estado en vivo necesita API key (17Track
  tiene free tier con límite).
- Contabilidad: cada MCP usa tu app de Intuit + OAuth (tus llaves).
