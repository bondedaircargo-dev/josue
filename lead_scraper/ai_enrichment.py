"""
AI Enrichment Module: usa Claude para analizar leads con potencial.
Solo se llama cuando el lead tiene score suficiente para no gastar tokens en baja calidad.
"""
import anthropic
from models import Lead
from config import ANTHROPIC_API_KEY
from utils import logger

JOSUE_CONTEXT = """
Eres un asistente comercial para Josué Javier, operador logístico internacional.
Su negocio principal: mover carga desde USA, China, Panamá, Dubai hacia República Dominicana y Haití usando Miami como hub.
Marcas: GA Interpack, MCPack / MCP Courier, One Courier.
Especialidad: carga bonded/in-bond (CBP 7512) — sin impuestos en USA, más rápido, más económico.
Tipos de carga: teléfonos, tablets, laptops, ropa, zapatos, TV, carga general.
Precios: ~$3.00–$3.20/lb a Haití | variable para RD.
"""


def enrich_lead(lead: Lead) -> Lead:
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY no configurada. Saltando AI enrichment.")
        return lead

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""
{JOSUE_CONTEXT}

Analiza este lead y responde en JSON con estos campos:
- what_they_do: qué hace esta empresa/persona (máx 100 chars)
- why_they_need_us: por qué pueden necesitar nuestros servicios (máx 150 chars)
- suggested_message_es: mensaje en español para contactarlos (máx 200 chars)
- suggested_message_en: mensaje en inglés (máx 200 chars)
- suggested_message_ht: mensaje en creole haitiano si aplica (máx 200 chars, si no aplica pon "")
- route_to_offer: qué ruta ofrecerles (ej: "Miami → Haiti", "China → RD", etc.)
- main_objection: qué objeción pueden tener
- opportunity_level: HOT/WARM/COLD

Datos del lead:
Empresa: {lead.company_name}
Web: {lead.website}
Email: {lead.email}
Teléfono: {lead.phone}
Ruta de interés detectada: {lead.route_interest}
Producto: {lead.product_interest}
Texto de la página: {lead.notes[:800]}

Responde SOLO el JSON, sin explicaciones.
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        raw = message.content[0].text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)

        lead.ai_analysis = (
            f"Qué hacen: {data.get('what_they_do', '')}\n"
            f"Por qué nos necesitan: {data.get('why_they_need_us', '')}\n"
            f"Ruta sugerida: {data.get('route_to_offer', '')}\n"
            f"Objeción: {data.get('main_objection', '')}"
        )
        lead.outreach_message = (
            f"[ES] {data.get('suggested_message_es', '')}\n"
            f"[EN] {data.get('suggested_message_en', '')}\n"
            f"[HT] {data.get('suggested_message_ht', '')}"
        )
        # Actualizar clasificacion si la IA dice HOT
        ai_level = data.get("opportunity_level", "")
        if ai_level == "HOT" and lead.classification not in ("PARTNER", "COMPETITOR"):
            lead.classification = "HOT"

    except Exception as e:
        logger.warning(f"AI enrichment error para {lead.source_url}: {e}")

    return lead
