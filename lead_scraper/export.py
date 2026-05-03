"""
Export Module: exporta leads a CSV y otros formatos.
"""
import os
import csv
from datetime import datetime
from typing import List
from config import EXPORTS_PATH
from database import get_all_leads
from utils import logger


def export_csv(classification: str = None, filename: str = None) -> str:
    os.makedirs(EXPORTS_PATH, exist_ok=True)

    if not filename:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        suffix = f"_{classification.lower()}" if classification else "_all"
        filename = f"leads{suffix}_{ts}.csv"

    filepath = os.path.join(EXPORTS_PATH, filename)
    leads = get_all_leads(classification=classification)

    if not leads:
        logger.warning("No hay leads para exportar.")
        return ""

    fieldnames = [
        "id", "company_name", "contact_name", "phone", "whatsapp",
        "email", "website", "social_url", "source_url", "country", "city",
        "lead_type", "route_interest", "product_interest", "score",
        "classification", "status", "notes", "ai_analysis",
        "outreach_message", "created_at",
    ]

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(leads)

    logger.info(f"Exportados {len(leads)} leads a {filepath}")
    return filepath


def export_hot_leads() -> str:
    return export_csv(classification="HOT")


def export_all_leads() -> str:
    return export_csv()
