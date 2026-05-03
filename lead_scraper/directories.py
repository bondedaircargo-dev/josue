"""
Directories Scraper - Raspa directorios publicos de negocios.
Fuentes GRATIS: Yellow Pages, Yelp, Manta, Superpages, Paginas Amarillas RD.

Potencial: 3,000 - 8,000 leads sin pagar nada.
"""
import requests
import time
import re
from typing import List, Optional
from bs4 import BeautifulSoup
from models import Lead
from utils import logger, random_delay, extract_phones, extract_emails, extract_whatsapp

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Busquedas por directorio
YELLOWPAGES_SEARCHES = [
    ("courier services",        "Miami, FL"),
    ("freight forwarding",      "Miami, FL"),
    ("shipping companies",      "Miami, FL"),
    ("import export",           "Miami, FL"),
    ("electronics wholesale",   "Miami, FL"),
    ("cell phones wholesale",   "Miami, FL"),
    ("courier services",        "Hialeah, FL"),
    ("shipping",                "Hialeah, FL"),
    ("electronics store",       "Miami, FL"),
    ("cargo company",           "Miami, FL"),
    ("courier services",        "Orlando, FL"),
    ("Caribbean shipping",      "Miami, FL"),
]

YELP_SEARCHES = [
    ("shipping",                "Miami, FL"),
    ("courier",                 "Miami, FL"),
    ("freight",                 "Miami, FL"),
    ("electronics wholesale",   "Miami, FL"),
    ("shipping",                "Hialeah, FL"),
]

MANTA_SEARCHES = [
    ("courier",                 "Miami FL"),
    ("freight forwarder",       "Miami FL"),
    ("import export",           "Miami FL"),
    ("shipping company",        "Miami FL"),
    ("electronics wholesale",   "Miami FL"),
]


# ──────────────────────────────────────────────
# YELLOW PAGES
# ──────────────────────────────────────────────

def scrape_yellowpages(search: str, location: str, max_pages: int = 5) -> List[Lead]:
    leads = []
    search_slug = search.replace(" ", "-").lower()
    location_slug = location.replace(", ", "-").replace(" ", "-").lower()

    for page_num in range(1, max_pages + 1):
        url = f"https://www.yellowpages.com/search?search_terms={search.replace(' ', '+')}&geo_location_terms={location.replace(' ', '+')}&page={page_num}"
        logger.info(f"YellowPages p{page_num}: {search} / {location}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "lxml")
            listings = soup.select("div.result")

            if not listings:
                break

            for listing in listings:
                lead = _parse_yp_listing(listing, location)
                if lead:
                    leads.append(lead)

            random_delay()

        except Exception as e:
            logger.warning(f"YellowPages error: {e}")
            break

    logger.info(f"  YellowPages '{search}' -> {len(leads)} leads")
    return leads


def _parse_yp_listing(listing, location: str) -> Optional[Lead]:
    try:
        # Nombre
        name_el = listing.select_one("a.business-name span, h2.n span")
        company_name = name_el.get_text(strip=True) if name_el else ""
        if not company_name:
            return None

        # Telefono
        phone_el = listing.select_one("div.phones.phone.primary, a.phone")
        phone = phone_el.get_text(strip=True) if phone_el else ""

        # Website
        web_el = listing.select_one("a.track-visit-website")
        website = web_el.get("href", "") if web_el else ""

        # Direccion
        addr_el = listing.select_one("p.adr")
        city_el = listing.select_one("span.city")
        city = city_el.get_text(strip=True) if city_el else location.split(",")[0]

        # Categoria
        cats = listing.select("div.categories a")
        category = ", ".join(c.get_text(strip=True) for c in cats[:3])

        # Ruta
        loc_lower = location.lower()
        if "miami" in loc_lower or "hialeah" in loc_lower or "orlando" in loc_lower:
            country = "USA"
            route = "Haiti + Dominican Republic"
        else:
            country = ""
            route = ""

        source_url = f"https://www.yellowpages.com{listing.select_one('a.business-name').get('href', '')}" if listing.select_one("a.business-name") else ""

        return Lead(
            company_name=company_name[:200],
            phone=phone,
            website=website[:200],
            source_url=source_url or f"https://www.yellowpages.com/search?search_terms={company_name}",
            country=country,
            city=city,
            lead_type="logistics" if any(w in category.lower() for w in ["courier", "shipping", "freight"]) else "general",
            route_interest=route,
            notes=f"YellowPages | Categoria: {category} | Ciudad: {city}",
        )
    except Exception:
        return None


# ──────────────────────────────────────────────
# YELP
# ──────────────────────────────────────────────

def scrape_yelp(search: str, location: str, max_pages: int = 5) -> List[Lead]:
    leads = []

    for page_num in range(max_pages):
        offset = page_num * 10
        url = f"https://www.yelp.com/search?find_desc={search.replace(' ', '+')}&find_loc={location.replace(' ', '+')}&start={offset}"
        logger.info(f"Yelp p{page_num+1}: {search} / {location}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "lxml")

            # Resultados en Yelp
            listings = soup.select('[data-testid="serp-ia-card"], div[class*="businessName"]')

            # Alternativa: buscar links de negocios
            biz_links = soup.select('a[href*="/biz/"]')
            seen = set()
            for link in biz_links:
                href = link.get("href", "")
                if "/biz/" in href and href not in seen:
                    seen.add(href)
                    name = link.get_text(strip=True)
                    if name and len(name) > 3:
                        full_url = f"https://www.yelp.com{href}" if href.startswith("/") else href
                        loc_lower = location.lower()
                        leads.append(Lead(
                            company_name=name[:200],
                            source_url=full_url,
                            country="USA" if "fl" in loc_lower or "ny" in loc_lower else "",
                            city=location.split(",")[0],
                            route_interest="Haiti + Dominican Republic",
                            lead_type="logistics" if any(w in name.lower() for w in ["courier", "ship", "cargo", "freight"]) else "general",
                            notes=f"Yelp | Busqueda: {search} en {location}",
                        ))

            if not biz_links:
                break
            random_delay()

        except Exception as e:
            logger.warning(f"Yelp error: {e}")
            break

    logger.info(f"  Yelp '{search}' -> {len(leads)} leads")
    return leads


# ──────────────────────────────────────────────
# MANTA (Directorio de negocios USA)
# ──────────────────────────────────────────────

def scrape_manta(search: str, location: str, max_pages: int = 5) -> List[Lead]:
    leads = []

    for page_num in range(1, max_pages + 1):
        url = f"https://www.manta.com/search?search_source=nav&search={search.replace(' ', '+')}&location={location.replace(' ', '+')}&pg={page_num}"
        logger.info(f"Manta p{page_num}: {search} / {location}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "lxml")
            listings = soup.select("article.search-result, div.company-entry")

            if not listings:
                break

            for listing in listings:
                name_el = listing.select_one("h2 a, h3 a, a.company-name")
                if not name_el:
                    continue
                company_name = name_el.get_text(strip=True)
                href = name_el.get("href", "")
                full_url = f"https://www.manta.com{href}" if href.startswith("/") else href

                phone_el = listing.select_one("span.phone, a[href^='tel:']")
                phone = ""
                if phone_el:
                    phone = phone_el.get_text(strip=True) or phone_el.get("href", "").replace("tel:", "")

                city_el = listing.select_one("span.city, .location")
                city = city_el.get_text(strip=True) if city_el else location.split(",")[0]

                leads.append(Lead(
                    company_name=company_name[:200],
                    phone=phone,
                    source_url=full_url,
                    country="USA",
                    city=city,
                    route_interest="Haiti + Dominican Republic",
                    lead_type="logistics" if any(w in company_name.lower() for w in ["courier", "shipping", "freight", "cargo"]) else "general",
                    notes=f"Manta.com | Busqueda: {search} en {location}",
                ))

            random_delay()

        except Exception as e:
            logger.warning(f"Manta error: {e}")
            break

    logger.info(f"  Manta '{search}' -> {len(leads)} leads")
    return leads


# ──────────────────────────────────────────────
# PAGINAS AMARILLAS REPUBLICA DOMINICANA
# ──────────────────────────────────────────────

PA_RD_SEARCHES = [
    "courier",
    "envios",
    "celulares",
    "importadora",
    "electronicos",
    "tienda celulares",
    "agencia de carga",
]


def scrape_paginasamarillas_rd(search: str, max_pages: int = 5) -> List[Lead]:
    """Paginas Amarillas Republica Dominicana - dominicanyellow.com o paginasamarillas.do"""
    leads = []

    for page_num in range(1, max_pages + 1):
        url = f"https://www.dominicanyellow.com/search/?q={search.replace(' ', '+')}&page={page_num}"
        logger.info(f"PA-RD p{page_num}: {search}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "lxml")

            for card in soup.select(".business-card, .listing-item, article"):
                name_el = card.select_one("h2, h3, .company-name, .business-name")
                if not name_el:
                    continue
                company_name = name_el.get_text(strip=True)
                if not company_name or len(company_name) < 3:
                    continue

                phone_el = card.select_one(".phone, a[href^='tel:'], .telephone")
                phone = ""
                if phone_el:
                    phone = phone_el.get_text(strip=True)
                    if not phone:
                        phone = phone_el.get("href", "").replace("tel:", "")

                email_el = card.select_one("a[href^='mailto:']")
                email = ""
                if email_el:
                    email = email_el.get("href", "").replace("mailto:", "")

                web_el = card.select_one("a.website, a[target='_blank']")
                website = web_el.get("href", "") if web_el else ""

                href = name_el.find_parent("a") or card.select_one("a")
                src_url = href.get("href", "") if href else ""
                if src_url and src_url.startswith("/"):
                    src_url = f"https://www.dominicanyellow.com{src_url}"

                leads.append(Lead(
                    company_name=company_name[:200],
                    phone=phone,
                    email=email,
                    website=website[:200],
                    source_url=src_url or f"https://www.dominicanyellow.com/search/?q={search}",
                    country="Dominican Republic",
                    city="Santo Domingo",
                    route_interest="Dominican Republic",
                    lead_type="electronics" if "celular" in search.lower() else "logistics" if any(w in search.lower() for w in ["courier", "envios", "carga"]) else "importer",
                    notes=f"Paginas Amarillas RD | Busqueda: {search}",
                ))

            if not soup.select(".business-card, .listing-item, article"):
                break
            random_delay()

        except Exception as e:
            logger.warning(f"PA-RD error: {e}")
            break

    logger.info(f"  PA-RD '{search}' -> {len(leads)} leads")
    return leads


# ──────────────────────────────────────────────
# RUNNER PRINCIPAL
# ──────────────────────────────────────────────

def scrape_all_directories(max_pages: int = 3) -> List[Lead]:
    """Raspa todos los directorios. Potencial: 2,000-5,000 leads."""
    all_leads = []

    logger.info("=== Yellow Pages ===")
    for search, location in YELLOWPAGES_SEARCHES:
        leads = scrape_yellowpages(search, location, max_pages=max_pages)
        all_leads.extend(leads)
        time.sleep(2)

    logger.info("=== Yelp ===")
    for search, location in YELP_SEARCHES:
        leads = scrape_yelp(search, location, max_pages=max_pages)
        all_leads.extend(leads)
        time.sleep(2)

    logger.info("=== Manta ===")
    for search, location in MANTA_SEARCHES:
        leads = scrape_manta(search, location, max_pages=max_pages)
        all_leads.extend(leads)
        time.sleep(2)

    logger.info("=== Paginas Amarillas RD ===")
    for search in PA_RD_SEARCHES:
        leads = scrape_paginasamarillas_rd(search, max_pages=max_pages)
        all_leads.extend(leads)
        time.sleep(2)

    logger.info(f"Total directorios: {len(all_leads)} leads")
    return all_leads
