"""
Google Maps Scraper - Mayor fuente de leads GRATIS.
Busca negocios por categoria y ciudad usando Playwright.

Fuentes de 10,000+ leads sin pagar:
  - Tiendas de electronicos en Miami / Santo Domingo / Port-au-Prince
  - Couriers y empresas de envios en Miami
  - Importadores y mayoristas
  - Freight forwarders

Uso:
    from google_maps import scrape_google_maps
    leads = scrape_google_maps("electronics store", "Miami, FL", max_results=200)
"""
import asyncio
import re
import time
from typing import List, Optional
from models import Lead
from utils import logger, random_delay, extract_phones, extract_emails

# Busquedas predefinidas para el negocio de Josue
MAPS_SEARCHES = [
    # Miami - captacion directa
    ("courier service",               "Miami, FL",          "courier"),
    ("shipping company",              "Miami, FL",          "logistics"),
    ("freight forwarder",             "Miami, FL",          "forwarder"),
    ("import export company",         "Miami, FL",          "importer"),
    ("electronics store wholesale",   "Miami, FL",          "electronics"),
    ("cell phone store",              "Miami, FL",          "electronics"),
    ("Dominican shipping",            "Miami, FL",          "logistics"),
    ("Haitian cargo",                 "Miami, FL",          "logistics"),
    ("envios a republica dominicana", "Miami, FL",          "logistics"),
    ("cargo to Haiti",                "Miami, FL",          "logistics"),
    # Hialeah / Little Haiti / Little Havana
    ("shipping store",                "Hialeah, FL",        "logistics"),
    ("courier",                       "Little Haiti Miami", "logistics"),
    ("electronics wholesale",         "Hialeah, FL",        "electronics"),
    # Santo Domingo - clientes destino
    ("tienda de celulares",           "Santo Domingo, RD",  "electronics"),
    ("importadora",                   "Santo Domingo, RD",  "importer"),
    ("courier",                       "Santo Domingo, RD",  "logistics"),
    ("agencia de envios",             "Santo Domingo, RD",  "logistics"),
    ("mayorista electronicos",        "Santo Domingo, RD",  "electronics"),
    # Santiago RD
    ("tienda celulares",              "Santiago, RD",       "electronics"),
    ("importadora",                   "Santiago, RD",       "importer"),
    # Port-au-Prince Haiti
    ("cargo company",                 "Port-au-Prince",     "logistics"),
    ("electronics store",             "Port-au-Prince",     "electronics"),
    ("shipping",                      "Port-au-Prince",     "logistics"),
    # Orlando / New York (dominicanos/haitianos)
    ("Dominican courier",             "Orlando, FL",        "logistics"),
    ("envios republica dominicana",   "New York, NY",       "logistics"),
    ("Haitian shipping",              "New York, NY",       "logistics"),
    ("Caribbean freight",             "New York, NY",       "logistics"),
]


async def _scrape_maps_async(query: str, location: str, lead_type: str,
                              max_results: int = 100) -> List[Lead]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error("Playwright no instalado. Ejecuta: pip install playwright && playwright install chromium")
        return []

    leads = []
    search_term = f"{query} {location}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        try:
            maps_url = f"https://www.google.com/maps/search/{search_term.replace(' ', '+')}"
            logger.info(f"Google Maps: {search_term}")
            await page.goto(maps_url, timeout=30000)
            await page.wait_for_timeout(3000)

            # Scrollear para cargar mas resultados
            results_panel = page.locator('[role="feed"]')
            loaded = 0
            while loaded < max_results:
                await results_panel.evaluate("el => el.scrollTop += 2000")
                await page.wait_for_timeout(2000)
                items = await page.locator('[role="feed"] > div[jsaction]').count()
                if items >= max_results or items == loaded:
                    break
                loaded = items

            # Extraer cada negocio
            items = page.locator('[role="feed"] > div[jsaction]')
            count = min(await items.count(), max_results)

            for i in range(count):
                try:
                    item = items.nth(i)
                    await item.click()
                    await page.wait_for_timeout(2000)

                    lead = await _extract_business_data(page, lead_type, location)
                    if lead:
                        leads.append(lead)
                        logger.info(f"  [{i+1}/{count}] {lead.company_name} | {lead.phone or 'sin tel'}")
                except Exception as e:
                    logger.debug(f"  Error item {i}: {e}")
                    continue

        except Exception as e:
            logger.warning(f"Error Google Maps ({search_term}): {e}")
        finally:
            await browser.close()

    return leads


async def _extract_business_data(page, lead_type: str, location: str) -> Optional[Lead]:
    try:
        # Nombre
        name_el = page.locator('h1[data-attrid="title"], h1.DUwDvf, [data-section-id="ap"] h1').first
        company_name = await name_el.inner_text() if await name_el.count() > 0 else ""

        # Telefono
        phone = ""
        phone_el = page.locator('[data-tooltip="Copy phone number"], [aria-label*="Phone"]').first
        if await phone_el.count() > 0:
            phone_text = await phone_el.inner_text()
            phones = extract_phones(phone_text)
            phone = phones[0] if phones else phone_text.strip()

        # Website
        website = ""
        web_el = page.locator('a[data-tooltip="Open website"]').first
        if await web_el.count() > 0:
            website = await web_el.get_attribute("href") or ""

        # Direccion / ciudad
        addr = ""
        addr_el = page.locator('[data-tooltip="Copy address"]').first
        if await addr_el.count() > 0:
            addr = await addr_el.inner_text()

        # Detectar ruta
        loc_lower = location.lower()
        if "miami" in loc_lower or "hialeah" in loc_lower or "orlando" in loc_lower or "new york" in loc_lower:
            country = "USA"
            city = location.split(",")[0]
            if "dominican" in location.lower() or "republica" in location.lower():
                route_interest = "Dominican Republic"
            elif "haiti" in location.lower():
                route_interest = "Haiti"
            else:
                route_interest = "Haiti + Dominican Republic"
        elif "santo domingo" in loc_lower or "santiago" in loc_lower or "rd" in loc_lower:
            country = "Dominican Republic"
            city = location.split(",")[0]
            route_interest = "Dominican Republic"
        elif "port-au-prince" in loc_lower or "haiti" in loc_lower:
            country = "Haiti"
            city = "Port-au-Prince"
            route_interest = "Haiti"
        else:
            country = ""
            city = location.split(",")[0]
            route_interest = ""

        if not company_name:
            return None

        source_url = page.url

        lead = Lead(
            company_name=company_name.strip()[:200],
            phone=phone,
            website=website[:200] if website else "",
            source_url=source_url,
            country=country,
            city=city,
            lead_type=lead_type,
            route_interest=route_interest,
            notes=f"Encontrado en Google Maps | Busqueda: {lead_type} en {location} | Direccion: {addr}",
        )
        return lead

    except Exception as e:
        logger.debug(f"Error extrayendo datos: {e}")
        return None


def scrape_google_maps(query: str, location: str, lead_type: str = "general",
                        max_results: int = 100) -> List[Lead]:
    """Wrapper sincrono para scraping de Google Maps."""
    return asyncio.run(_scrape_maps_async(query, location, lead_type, max_results))


def scrape_all_maps_searches(max_per_search: int = 100) -> List[Lead]:
    """Ejecuta todas las busquedas predefinidas."""
    all_leads = []
    for query, location, lead_type in MAPS_SEARCHES:
        leads = scrape_google_maps(query, location, lead_type, max_results=max_per_search)
        all_leads.extend(leads)
        logger.info(f"Subtotal acumulado: {len(all_leads)} leads")
        time.sleep(3)
    return all_leads
