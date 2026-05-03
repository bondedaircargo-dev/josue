"""
Template engine — loads HTML + plain-text templates and personalizes them.

Templates live in /templates/ as Jinja2 files:
  - logistics_offer.html / .txt
  - partnership.html / .txt
  - short_intro.html / .txt

Each template receives a context dict with at minimum:
  company_name, country, first_name (optional)
"""

import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

from config.settings import TMPL_DIR, EMAIL_NAME

logger = logging.getLogger(__name__)

_env = Environment(
    loader=FileSystemLoader(str(TMPL_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_template(template_name: str, context: dict) -> tuple[str, str]:
    """
    Render both HTML and plain-text variants of a template.

    Returns:
        (html_body, text_body) — use whichever is appropriate.
    """
    context.setdefault("sender_name", EMAIL_NAME)
    context.setdefault("first_name", "")

    html_body = _render(f"{template_name}.html", context)
    text_body = _render(f"{template_name}.txt", context)
    return html_body, text_body


def _render(filename: str, context: dict) -> str:
    try:
        tmpl = _env.get_template(filename)
        return tmpl.render(**context)
    except Exception as exc:
        logger.warning("Template %s not found or failed: %s", filename, exc)
        return ""


def build_subject(template_name: str, company_name: str = "") -> str:
    subjects = {
        "logistics_offer": f"Freight & Logistics Services — Miami to Dominican Republic / Haiti",
        "partnership":     f"Partnership Opportunity — International Shipping",
        "short_intro":     f"Quick intro — Bonded Air Cargo | Miami Logistics",
    }
    base = subjects.get(template_name, "Business Opportunity — Bonded Air Cargo")
    return base


def choose_template(lead: dict) -> str:
    """Pick the best template based on company type and country."""
    ctype = lead.get("company_type", "").lower()
    country = lead.get("country", "").lower()

    if "freight" in ctype or "forwarder" in ctype:
        return "partnership"
    if country in ("china", "vietnam"):
        return "logistics_offer"
    return "short_intro"
