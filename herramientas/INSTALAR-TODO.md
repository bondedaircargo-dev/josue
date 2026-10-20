# INSTALAR TODO — Playbook paso a paso (Bonded Air Cargo)

Todo lo seguro, en orden, para copiar y pegar en **tu Claude Code local** (tu computadora).
Hazlo por fases. La Fase 1 no necesita ninguna llave y te da el 90% del valor.

> Regla: todo aquí es 🟢 (skills = instrucciones; conectores = API oficial con TUS llaves).
> Nada de scrapers ni logins personales.

---

## Fase 0 — Requisitos (una vez)
- Tener **Claude Code** instalado en tu PC.
- Tener **Node.js** (trae `npx`). Verifica con: `node -v` y `npx -v`.

---

## Fase 1 — Skills sin llaves (empieza aquí, ~5 min)

Haz uno, confirma, sigue al siguiente.

**1. Repo oficial de Anthropic**
```
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```
**2. Marketing (Corey Haines, 52 skills)**
```
npx skills add coreyhaines31/marketingskills -a claude-code
```
**3. Facturación y cobros**
```
npx skills add Ootto-AI/claude-invoice-skills -a claude-code
```
**4. Soporte / triage de clientes**
```
npx skills add composio-community/support-skills -a claude-code
```
**5. Operaciones de negocio (oficial Anthropic, 44 skills)**
```
/plugin marketplace add anthropics/knowledge-work-plugins
/plugin install small-business@knowledge-work-plugins
```
> Si un nombre de plugin no coincide, abre el repo y usa el nombre exacto del README.

✅ Con esto ya tienes skills de documentos, marketing, facturación, soporte y operaciones.

---

## Fase 2 — Conectores sin llaves (opcional, útil)

Los MCP se agregan con `claude mcp add <nombre> -- <comando del README>`.
El comando exacto está en cada repo (varía por proyecto).

**6. Tracking sin API key** — detecta carrier y da URL oficial de rastreo.
Repo: `Scottcjn/package-tracker-mcp` → sigue su README para el comando `claude mcp add`.

**7. Archivos locales (Filesystem MCP oficial)** — Claude lee/organiza UNA carpeta tuya
(ej. tus facturas/reportes). Dale acceso solo a esa carpeta.

---

## Fase 3 — Conectores que piden una llave/OAuth (tu cuenta = seguro)

Necesitan que generes tus propias credenciales. Sigue el README de cada repo.

**8. Google Workspace (Gmail + Drive + Sheets + Calendar)** — el de mayor impacto.
Repo: `taylorwilsdon/google_workspace_mcp`. Necesita OAuth de Google (gratis, tu cuenta).
*(Dale acceso mínimo: la hoja/cuenta que usa el sistema.)*

**9. Tracking con estado en vivo (2900+ carriers)**
Repo: `pocharlies/mcp-17track`. Necesita una API key gratis de 17Track (tiene límite free).

**10. Contabilidad QuickBooks (oficial Intuit)**
Repo: `intuit/quickbooks-online-mcp-server`. Necesita una app de Intuit Developer + OAuth.
*(Ya tienes QuickBooks conectado en la sesión de Claude; esto es para tu máquina.)*

---

## Reglas de seguridad al conectar
- Acceso **mínimo**: una hoja, una carpeta, solo lectura si alcanza.
- Guarda las llaves en variables de entorno, **no** en el repo.
- Autor conocido + estrellas; si dudas de un repo, pídeme que lo revise antes.

## Orden recomendado
1. Fase 1 completa (skills, sin llaves).
2. #6 tracking sin llave.
3. #8 Google Workspace (impacto alto).
4. El resto según lo necesites.
