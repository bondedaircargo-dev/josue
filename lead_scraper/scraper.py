"""
Scraper Module: visita URLs y extrae datos de contacto y contexto.
"""
import requests
from bs4 import BeautifulSoup
from typing import Optional
from models import Lead
from utils import (
    logger, random_delay, extract_emails, extract_phones,
    extract_whatsapp, extract_social_links, clean_text, get_domain,
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


def fetch_page(url: str, timeout: int = 15) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except requests.exceptions.SSLError:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=timeout, verify=False)
            return resp.text
        except Exception:
            return None
    except Exception as e:
        logger.warning(f"Error fetching {url}: {e}")
        return None


def parse_page(html: str, url: str) -> Lead:
    soup = BeautifulSoup(html, "lxml")

    # Eliminar scripts y estilos
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()

    text = clean_text(soup.get_text(separator=" "))

    # Titulo / nombre de empresa
    title = ""
    if soup.find("title"):
        title = soup.find("title").get_text(strip=True)
    og_name = soup.find("meta", {"property": "og:site_name"})
    company_name = og_name["content"] if og_name else title.split("|")[0].strip()

    # Emails y telefonos
    emails = extract_emails(text + " " + html)
    phones = extract_phones(text + " " + html)
    whatsapp = extract_whatsapp(text, html)

    # Redes sociales
    socials = extract_social_links(html)
    social_url = (
        socials.get("instagram") or socials.get("facebook") or
        socials.get("tiktok") or socials.get("linkedin") or ""
    )

    # Contacto de la pagina
    contact_name = ""
    for meta in ["author", "twitter:creator"]:
        tag = soup.find("meta", {"name": meta}) or soup.find("meta", {"property": meta})
        if tag and tag.get("content"):
            contact_name = tag["content"]
            break

    lead = Lead(
        company_name=company_name[:200],
        contact_name=contact_name[:100],
        phone=phones[0] if phones else "",
        whatsapp=whatsapp,
        email=emails[0] if emails else "",
        website=get_domain(url),
        social_url=social_url,
        source_url=url,
        notes=text[:1000],
    )
    return lead


def scrape_url(url: str) -> Optional[Lead]:
    logger.info(f"Scraping: {url}")
    html = fetch_page(url)
    if not html:
        return None
    lead = parse_page(html, url)
    random_delay()
    return lead
