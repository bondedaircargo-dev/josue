"""
Outreach Module: genera mensajes personalizados listos para copiar.
NO envia mensajes automaticamente.
"""
from models import Lead


TEMPLATES = {
    "es": {
        "logistics": (
            "Hola {name}! Vi tu empresa de logística y creo que podemos colaborar. "
            "Somos GA Interpack / MCPack, operamos carga bonded Miami → {route}. "
            "Sin impuestos en USA, entrega en 2-4 días. ¿Hablamos?"
        ),
        "electronics": (
            "Hola {name}! Movemos celulares, tablets y electrónicos desde China y USA "
            "hacia {route} sin impuestos (carga bonded). ¿Quieres cotización?"
        ),
        "general": (
            "Hola {name}! Somos GA Interpack, operamos carga Miami → {route}. "
            "Carga bonded: sin impuestos en USA, 2-4 días. ¿Te interesa?"
        ),
    },
    "en": {
        "logistics": (
            "Hi {name}! Saw your logistics business and think we can partner. "
            "We operate bonded cargo Miami → {route}. No US taxes, 2-4 day delivery. "
            "Let's talk!"
        ),
        "electronics": (
            "Hi {name}! We move phones, tablets & electronics from China/USA to {route} "
            "duty-free (bonded cargo). Want a quote?"
        ),
        "general": (
            "Hi {name}! We're GA Interpack, bonded cargo Miami → {route}. "
            "No US taxes, fast delivery. Interested?"
        ),
    },
    "ht": {
        "general": (
            "Alo {name}! Nou se GA Interpack, nou transpòte machandiz Miami → Ayiti. "
            "Pa gen taks Etazini, livrezon 2-4 jou. Ou enterese?"
        ),
    },
}


def generate_messages(lead: Lead) -> dict:
    name = lead.contact_name or lead.company_name or "equipo"
    route = lead.route_interest if lead.route_interest != "Unknown" else "RD / Haiti"

    lead_type = lead.lead_type if lead.lead_type in ("logistics", "electronics") else "general"

    messages = {}

    # Español
    tpl_es = TEMPLATES["en"].get(lead_type, TEMPLATES["es"]["general"])
    messages["es"] = TEMPLATES["es"].get(lead_type, TEMPLATES["es"]["general"]).format(
        name=name, route=route
    )

    # Inglés
    messages["en"] = TEMPLATES["en"].get(lead_type, TEMPLATES["en"]["general"]).format(
        name=name, route=route
    )

    # Creole (solo si ruta incluye Haiti)
    if "Haiti" in route:
        messages["ht"] = TEMPLATES["ht"]["general"].format(name=name, route=route)

    return messages


def format_outreach_for_lead(lead: Lead) -> str:
    if lead.outreach_message:
        return lead.outreach_message

    messages = generate_messages(lead)
    lines = []
    for lang, msg in messages.items():
        lang_label = {"es": "Español", "en": "English", "ht": "Kreyòl"}.get(lang, lang)
        lines.append(f"[{lang_label}]\n{msg}")
    return "\n\n".join(lines)
