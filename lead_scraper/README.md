# GA Interpack Lead Scraper

Sistema automático para encontrar clientes potenciales que necesitan enviar carga hacia República Dominicana y Haití.

---

## Estructura del proyecto

```
lead_scraper/
  main.py           # CLI principal
  config.py         # Configuración y keywords
  database.py       # SQLite: guardar/buscar leads
  models.py         # Modelo de datos Lead
  search.py         # Buscar URLs en Google/SerpAPI/DuckDuckGo
  scraper.py        # Visitar páginas y extraer datos
  classifier.py     # Clasificar leads sin IA
  ai_enrichment.py  # Análisis profundo con Claude
  outreach.py       # Generar mensajes de contacto
  export.py         # Exportar a CSV
  dashboard.py      # Ver estadísticas y tabla
  utils.py          # Funciones comunes
  data/
    leads.db        # Base de datos (se crea sola)
    exports/        # CSVs exportados
```

---

## Instalación en Windows (PowerShell)

### 1. Instalar Python 3.11+
Descargar de: https://www.python.org/downloads/
Marcar "Add Python to PATH" durante la instalación.

### 2. Abrir PowerShell y navegar al proyecto
```powershell
cd C:\ruta\al\proyecto\lead_scraper
```

### 3. Crear entorno virtual
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Si da error de permisos:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 4. Instalar dependencias
```powershell
pip install -r requirements.txt
```

### 5. Configurar variables de entorno
```powershell
Copy-Item .env.example .env
notepad .env
```

Editar `.env` y agregar tus API keys (ver sección API Keys abajo).

### 6. Inicializar base de datos
```powershell
python main.py init
```

---

## Comandos principales

### Ver ayuda
```powershell
python main.py --help
```

### Ciclo completo (buscar + scrapear + clasificar)
```powershell
# Con 3 keywords (rápido para probar)
python main.py run-full --limit 3

# Con todas las keywords predefinidas
python main.py run-full --limit 20

# Con AI enrichment activado (necesita ANTHROPIC_API_KEY)
python main.py run-full --limit 5 --ai
```

### Solo buscar URLs
```powershell
# Buscar con keywords predefinidas (primeras 5)
python main.py search --limit 5

# Buscar con keyword personalizada
python main.py search --keyword "courier dominicano miami" --keyword "envios haiti"

# Buscar con todas las keywords
python main.py search --all
```

### Solo scrapear
```powershell
# Scrapear URL específica
python main.py scrape --url https://ejemplocourier.com

# Scrapear todas las URLs encontradas por search
python main.py scrape --from-file

# Scrapear + AI enrichment para HOT/WARM
python main.py scrape --from-file --ai
```

### Ver estadísticas
```powershell
python main.py stats
```

### Ver lista de leads
```powershell
# Todos los leads
python main.py leads

# Solo HOT
python main.py leads --class HOT

# Solo WARM, máx 20
python main.py leads --class WARM --limit 20
```

### Ver detalle de un lead
```powershell
python main.py detail 1
```
Muestra todos los datos + análisis IA + mensajes de contacto listos.

### Enriquecer con IA
```powershell
# Lead específico
python main.py enrich --id 5

# Todos los HOT
python main.py enrich --hot
```

### Exportar CSV
```powershell
# Exportar todos
python main.py export

# Solo HOT
python main.py export --class HOT

# Con nombre personalizado
python main.py export --class HOT --file mis_hot_leads.csv
```

El CSV se guarda en `data/exports/`.

---

## Clasificación de Leads

| Clase | Descripción |
|-------|-------------|
| 🔥 HOT | Importador, tienda, negocio con alto volumen. Score >= 60 |
| ⚡ WARM | Persona o negocio pequeño con potencial. Score >= 35 |
| 🧊 COLD | Info incompleta o baja probabilidad. Score < 35 |
| 🤝 PARTNER | Freight forwarder o empresa que puede dar volumen |
| ⚔️ COMPETITOR | Courier o empresa logística competidora |

### Cómo se calcula el score (0-100)
- Email presente: +20
- Teléfono presente: +15
- WhatsApp presente: +20
- Website presente: +10
- Red social presente: +5
- Ruta de interés detectada: +15
- Tipo logístico: +10
- Producto electrónico: +5

---

## API Keys

### `.env` configuración

```env
# Claude AI (para AI enrichment)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# SerpAPI - 100 búsquedas/mes gratis
# Registrarse en: https://serpapi.com
SERPAPI_KEY=tu_key_aqui

# Google Custom Search (opcional, alternativa a SerpAPI)
GOOGLE_API_KEY=tu_key_aqui
GOOGLE_CSE_ID=tu_cse_id_aqui
```

**Sin API keys:** El sistema funciona con DuckDuckGo (sin límites pero más lento).
**Con SerpAPI gratis:** 100 búsquedas/mes, resultados más precisos.
**Con Anthropic:** AI enrichment activado para análisis profundo.

---

## Integración con n8n

El sistema exporta CSV que n8n puede consumir:

### Opción 1: Leer CSV con n8n
1. Nodo: "Read Binary File" → apunta a `data/exports/leads_hot_*.csv`
2. Nodo: "Spreadsheet File" → parsea el CSV
3. Nodo: HTTP Request / WhatsApp / Email → envía mensajes

### Opción 2: Conectar SQLite con n8n
1. Instalar nodo community: `n8n-nodes-sqlite`
2. DB Path: `ruta/completa/a/data/leads.db`
3. Query: `SELECT * FROM leads WHERE classification='HOT' AND status='NEW'`

### Opción 3: API REST (si activas el dashboard FastAPI)
```powershell
# Iniciar API (proximamente)
python main.py serve
```
n8n llama a `http://localhost:8000/api/leads?classification=HOT`

---

## Cómo evitar duplicados

El sistema usa `source_url` como campo UNIQUE en SQLite.
Si una URL ya fue scrapeada, se salta automáticamente con mensaje `[skipped]`.

También puedes verificar manualmente:
```python
# En Python
from database import url_exists
url_exists("https://ejemplo.com")  # True/False
```

---

## Cómo pausar y reanudar

El sistema no tiene estado de "pausa" — simplemente detén el proceso (Ctrl+C).

Al reanudar:
```powershell
# Las URLs ya procesadas se saltan automáticamente
python main.py scrape --from-file
```

Para reiniciar desde cero:
```powershell
# Eliminar DB (cuidado: pierdes todos los leads)
del data\leads.db
python main.py init
```

---

## Ver logs

Los logs se guardan en `data/scraper.log`:
```powershell
# Ver logs en tiempo real
Get-Content data\scraper.log -Wait

# Ver últimas 50 líneas
Get-Content data\scraper.log -Tail 50
```

Cambiar nivel de log en `.env`:
```env
LOG_LEVEL=DEBUG   # Más detalle
LOG_LEVEL=INFO    # Normal (default)
LOG_LEVEL=WARNING # Solo errores
```

---

## Flujo recomendado

```
1. python main.py init
2. python main.py search --limit 5
3. python main.py scrape --from-file
4. python main.py stats
5. python main.py leads --class HOT
6. python main.py detail <id>
7. python main.py enrich --hot   (si tienes API key)
8. python main.py export --class HOT
```

---

## Agregar keywords personalizadas

Editar `config.py`, sección `SEARCH_KEYWORDS`:
```python
SEARCH_KEYWORDS = [
    "tu keyword nueva aqui",
    "otro termino de busqueda",
    ...
]
```

O usar directamente en CLI:
```powershell
python main.py search --keyword "importadores telefonos santiago dominicana"
```

---

## Notas legales

- Solo fuentes públicas
- Respeta robots.txt
- Delays configurables entre requests
- No spam automático
- El `source_url` siempre se guarda como evidencia
