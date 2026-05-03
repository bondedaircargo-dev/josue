import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
DB_PATH = os.getenv("DB_PATH", "data/leads.db")
EXPORTS_PATH = os.getenv("EXPORTS_PATH", "data/exports/")

DELAY_MIN = float(os.getenv("DELAY_MIN", "2"))
DELAY_MAX = float(os.getenv("DELAY_MAX", "5"))
MAX_URLS_PER_SEARCH = int(os.getenv("MAX_URLS_PER_SEARCH", "10"))
AUTO_AI_ENRICHMENT = os.getenv("AUTO_AI_ENRICHMENT", "false").lower() == "true"

# Keywords de busqueda para captar leads
SEARCH_KEYWORDS = [
    # Casillero / courier RD
    "casillero miami republica dominicana",
    "envios desde usa a republica dominicana",
    "courier miami santo domingo",
    "shipping miami to dominican republic",
    "enviar cajas a republica dominicana desde miami",
    # Haiti
    "shipping to haiti miami",
    "cargo to haiti",
    "freight forwarder haiti",
    "cargo miami to haiti",
    "haitian cargo miami",
    "shipping boxes to haiti",
    # China -> Caribe
    "china shipping to dominican republic",
    "china to haiti cargo",
    "importar desde china a republica dominicana",
    # Importadores / tiendas
    "tienda de celulares republica dominicana importador",
    "importadores de telefonos dominicanos",
    "cell phone store haiti wholesale",
    "import phones dominican republic",
    # Freight forwarders competidores/socios
    "freight forwarder dominican republic miami",
    "dominican courier miami florida",
    "courier dominicano en miami",
]

# Palabras clave para clasificacion
LOGISTICS_KEYWORDS = [
    "courier", "shipping", "cargo", "freight", "logistic", "forwarder",
    "casillero", "envios", "enviar", "transporte", "carga", "paquete",
    "importacion", "importar", "export", "aduanas", "customs", "consolidado",
    "warehouse", "almacen", "delivery", "envio", "flete",
]

ELECTRONICS_KEYWORDS = [
    "phone", "celular", "telefono", "tablet", "laptop", "electronics",
    "electronico", "televisor", "tv", "accesorio", "iphone", "samsung",
    "android", "computadora", "computer", "gadget",
]

FASHION_KEYWORDS = [
    "ropa", "zapatos", "clothing", "shoes", "fashion", "moda",
    "calzado", "sneakers", "tenis", "apparel", "boutique",
]

HAITI_KEYWORDS = [
    "haiti", "haitian", "port-au-prince", "cap haitien", "cap-haitien",
    "gonaives", "jacmel", "creole", "kreyol", "ayiti",
]

DR_KEYWORDS = [
    "dominican republic", "republica dominicana", "santo domingo",
    "santiago", "rd", "dominicana", "dominicano", "dominican",
    "punta cana", "la romana",
]
