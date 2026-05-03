"""
Classifier Module: clasifica leads usando reglas sin gastar tokens de IA.
"""
from models import Lead
from config import (
    LOGISTICS_KEYWORDS, ELECTRONICS_KEYWORDS,
    FASHION_KEYWORDS, HAITI_KEYWORDS, DR_KEYWORDS,
)


def _count_keywords(text: str, keywords: list) -> int:
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def classify_lead(lead: Lead) -> Lead:
    text = " ".join([
        lead.company_name, lead.contact_name, lead.website,
        lead.notes, lead.social_url, lead.source_url,
    ]).lower()

    # --- lead_type ---
    logistics_score = _count_keywords(text, LOGISTICS_KEYWORDS)
    if logistics_score >= 3:
        lead.lead_type = "logistics"
    elif logistics_score >= 1:
        lead.lead_type = "possible_logistics"
    else:
        lead.lead_type = "general"

    # Detectar forwarder / competidor
    forwarder_words = ["freight forwarder", "forwarding", "logistic company", "empresa logistica"]
    competitor_words = ["casillero", "courier service", "envios express", "shipping company"]
    if any(w in text for w in forwarder_words):
        lead.lead_type = "forwarder"
    if any(w in text for w in competitor_words):
        lead.lead_type = "courier"

    # --- product_interest ---
    if _count_keywords(text, ELECTRONICS_KEYWORDS) >= 2:
        lead.product_interest = "electronics"
    elif _count_keywords(text, FASHION_KEYWORDS) >= 2:
        lead.product_interest = "fashion"
    else:
        lead.product_interest = "general"

    # --- route_interest ---
    haiti_score = _count_keywords(text, HAITI_KEYWORDS)
    dr_score = _count_keywords(text, DR_KEYWORDS)
    if haiti_score > 0 and dr_score > 0:
        lead.route_interest = "Haiti + Dominican Republic"
    elif haiti_score > 0:
        lead.route_interest = "Haiti"
    elif dr_score > 0:
        lead.route_interest = "Dominican Republic"
    else:
        lead.route_interest = "Unknown"

    # --- score (0-100) ---
    score = 0
    if lead.email:
        score += 20
    if lead.phone:
        score += 15
    if lead.whatsapp:
        score += 20
    if lead.website:
        score += 10
    if lead.social_url:
        score += 5
    if lead.route_interest != "Unknown":
        score += 15
    if lead.lead_type in ("logistics", "forwarder", "courier"):
        score += 10
    if lead.product_interest == "electronics":
        score += 5
    lead.score = min(score, 100)

    # --- classification ---
    if lead.lead_type == "forwarder":
        lead.classification = "PARTNER"
    elif lead.lead_type == "courier":
        # Determinar si es competidor o posible socio
        if lead.route_interest in ("Haiti", "Dominican Republic", "Haiti + Dominican Republic"):
            lead.classification = "COMPETITOR"
        else:
            lead.classification = "PARTNER"
    elif lead.score >= 60:
        lead.classification = "HOT"
    elif lead.score >= 35:
        lead.classification = "WARM"
    else:
        lead.classification = "COLD"

    return lead
