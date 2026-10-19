# Conectores MCP Gratis y Seguros — Bonded Air Cargo

Servidores MCP (conectores) gratuitos y seguros, útiles para el stack del negocio
(Google Sheets, Gmail, Drive, PDFs/OCR, archivos). Color = seguridad.

> Regla: un MCP **corre código en tu máquina** y se conecta a servicios. Es 🟢 seguro
> cuando: usa **API oficial + TUS llaves/OAuth**, lo **alojas tú**, es de **autor conocido
> con estrellas**, y le das **acceso mínimo** (una hoja, solo lectura si alcanza).
> Es 🔴 cuando pide tu login personal o es un panel "gratis" en nube ajena.

---

## Directorios para explorar (hay cientos)
- **`tolkonepiu/best-of-mcp-servers`** — 400 MCP rankeados, ~1.4M ⭐ en total, 34 categorías,
  actualizado semanalmente.
- **`appcypher/awesome-mcp-servers`** — lista comunitaria clásica.
- **`wong2/awesome-mcp-servers`** — otra lista comunitaria.

## 🟢 Recomendados para el negocio

### 1. Google Workspace MCP — `taylorwilsdon/google_workspace_mcp`
Gmail + Drive + Docs + Sheets + Calendar en uno. MIT, OAuth 2.1, gratis, cuenta Google
normal. El más completo (ya se usan Sheets y Gmail en el sistema).

### 2. Google Sheets MCP — `freema/mcp-gsheets`
Solo Sheets: leer/escribir rangos, buscar, formatear, validar. Más ligero.

### 3. Paperless-NGX (gestión documental + OCR)
Lee texto de PDFs y fotos escaneadas (facturas, AWB, documentos de aduana). Open source,
self-hosted.

### 4. Filesystem MCP (oficial de referencia)
Claude lee/organiza archivos de una carpeta designada (facturas, reportes).

---

## Checklist antes de conectar cualquier MCP
- [ ] ¿Usa API oficial con MIS llaves/OAuth (no mi login personal)?
- [ ] ¿Autor conocido, open source, con estrellas?
- [ ] ¿Le puedo dar acceso mínimo (una hoja/carpeta, solo lectura si alcanza)?
- [ ] ¿Lo alojo yo (self-hosted), no un tercero?
- [ ] ¿Puedo revocar el acceso cuando quiera?

Si alguna es "no" → preguntar antes de instalar. Ver `roadmap-seguro.md` para el semáforo.
