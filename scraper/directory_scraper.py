"""
Directory scrapers — public, no-login sources:

  1. ThomasNet         — US industrial & logistics suppliers
  2. ImportYeti        — US import records (public)
  3. Kompass           — International B2B directory
  4. FreightCourse     — Freight forwarder directory
  5. FIATA directory   — International freight forwarders association
  6. Alibaba (public)  — Chinese suppliers (no login required for basic info)
  7. ExportGenius-like — Public trade data pages
"""

import logging
import re
from urllib.parse import urljoin, quote_plus

from bs4 import BeautifulSoup

from scraper.utils import make_session, polite_sleep, extract_emails, normalize_phone

logger = logging.getLogger(__name__)


class DirectoryScraper:
    def __init__(self):
        self.session = make_session()

    def collect_leads(self) -> list[dict]:
        all_leads: list[dict] = []

        scrapers = [
            ("ImportYeti",    self._scrape_importyeti),
            ("ThomasNet",     self._scrape_thomasnet),
            ("Kompass",       self._scrape_kompass),
            ("FreightCourse", self._scrape_freightcourse),
        ]

        for name, fn in scrapers:
            logger.info("Scraping %s ...", name)
            try:
                leads = fn()
                logger.info("  → %d leads from %s", len(leads), name)
                all_leads.extend(leads)
            except Exception as exc:
                logger.warning("%s failed: %s", name, exc)
            polite_sleep()

        return all_leads

    # ── ImportYeti ─────────────────────────────────────────────────────────────
    # Public trade data: shows importers by country and product.

    def _scrape_importyeti(self) -> list[dict]:
        leads = []
        searches = [
            "https://www.importyeti.com/search?query=dominican+republic+logistics",
            "https://www.importyeti.com/search?query=haiti+freight",
            "https://www.importyeti.com/search?query=caribbean+shipping",
        ]
        for url in searches:
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                leads += self._parse_importyeti_results(soup)
                polite_sleep(5, 10)
            except Exception as exc:
                logger.debug("ImportYeti error %s: %s", url, exc)
        return leads

    def _parse_importyeti_results(self, soup: BeautifulSoup) -> list[dict]:
        leads = []
        # ImportYeti renders company cards with class "company-card" or similar
        for card in soup.select("[class*='company'], [class*='result'], [class*='shipper']"):
            name = self._text(card, "h2, h3, h4, [class*='name'], [class*='title']")
            website = ""
            link = card.select_one("a[href*='importyeti.com/company']")
            if link:
                website = "https://www.importyeti.com" + link["href"]
            email_text = card.get_text()
            emails = extract_emails(email_text)
            if name:
                leads.append({
                    "company_name": name,
                    "email": emails[0] if emails else "",
                    "all_emails": "; ".join(emails),
                    "phone": "",
                    "website": website,
                    "country": "USA",
                    "company_type": "importer/shipper",
                    "source": "importyeti",
                })
        return leads

    # ── ThomasNet ─────────────────────────────────────────────────────────────

    def _scrape_thomasnet(self) -> list[dict]:
        leads = []
        queries = [
            "freight-forwarders",
            "logistics-services",
            "warehousing-and-storage",
        ]
        for q in queries:
            url = f"https://www.thomasnet.com/products/{q}/"
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                leads += self._parse_thomasnet(soup)
                polite_sleep()
            except Exception as exc:
                logger.debug("ThomasNet error: %s", exc)
        return leads

    def _parse_thomasnet(self, soup: BeautifulSoup) -> list[dict]:
        leads = []
        for card in soup.select("[class*='supplier'], [class*='profile-card'], [class*='company']"):
            name = self._text(card, "h2, h3, [class*='name']")
            website_tag = card.select_one("a[href^='http']")
            website = website_tag["href"] if website_tag else ""
            phone_tag = card.select_one("[class*='phone'], [class*='tel']")
            phone = normalize_phone(phone_tag.get_text()) if phone_tag else ""
            emails = extract_emails(card.get_text())
            if name:
                leads.append({
                    "company_name": name,
                    "email": emails[0] if emails else "",
                    "all_emails": "; ".join(emails),
                    "phone": phone,
                    "website": website,
                    "country": "USA",
                    "company_type": "logistics",
                    "source": "thomasnet",
                })
        return leads

    # ── Kompass ───────────────────────────────────────────────────────────────

    def _scrape_kompass(self) -> list[dict]:
        leads = []
        queries = [
            ("freight forwarding", "us"),
            ("freight forwarding", "cn"),
            ("logistics", "vn"),
            ("freight forwarding", "ca"),
        ]
        country_map = {"us": "USA", "cn": "China", "vn": "Vietnam", "ca": "Canada"}

        for keyword, country_code in queries:
            url = (
                f"https://us.kompass.com/searchCompany"
                f"?text={quote_plus(keyword)}&country={country_code}"
            )
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                leads += self._parse_kompass(soup, country_map.get(country_code, "Unknown"))
                polite_sleep()
            except Exception as exc:
                logger.debug("Kompass error: %s", exc)
        return leads

    def _parse_kompass(self, soup: BeautifulSoup, country: str) -> list[dict]:
        leads = []
        for card in soup.select("[class*='company-result'], [class*='result-item']"):
            name = self._text(card, "h2, h3, [class*='company-name']")
            link = card.select_one("a[href]")
            website = link["href"] if link else ""
            if website and not website.startswith("http"):
                website = "https://us.kompass.com" + website
            emails = extract_emails(card.get_text())
            if name:
                leads.append({
                    "company_name": name,
                    "email": emails[0] if emails else "",
                    "all_emails": "; ".join(emails),
                    "phone": "",
                    "website": website,
                    "country": country,
                    "company_type": "freight forwarder",
                    "source": "kompass",
                })
        return leads

    # ── FreightCourse directory ───────────────────────────────────────────────

    def _scrape_freightcourse(self) -> list[dict]:
        leads = []
        pages = [
            "https://www.freightcourse.com/freight-forwarders/united-states/",
            "https://www.freightcourse.com/freight-forwarders/china/",
            "https://www.freightcourse.com/freight-forwarders/vietnam/",
            "https://www.freightcourse.com/freight-forwarders/canada/",
        ]
        country_map = {
            "united-states": "USA",
            "china": "China",
            "vietnam": "Vietnam",
            "canada": "Canada",
        }
        for url in pages:
            try:
                resp = self.session.get(url, timeout=20)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                country = next(
                    (v for k, v in country_map.items() if k in url), "Unknown"
                )
                leads += self._parse_freightcourse(soup, country)
                polite_sleep()
            except Exception as exc:
                logger.debug("FreightCourse error: %s", exc)
        return leads

    def _parse_freightcourse(self, soup: BeautifulSoup, country: str) -> list[dict]:
        leads = []
        for card in soup.select("article, [class*='forwarder'], [class*='company']"):
            name = self._text(card, "h2, h3, h4, [class*='name']")
            link = card.select_one("a[href^='http']")
            website = link["href"] if link else ""
            emails = extract_emails(card.get_text())
            phone_match = re.search(r"(\+?[\d\s\-().]{8,})", card.get_text())
            phone = normalize_phone(phone_match.group(1)) if phone_match else ""
            if name:
                leads.append({
                    "company_name": name,
                    "email": emails[0] if emails else "",
                    "all_emails": "; ".join(emails),
                    "phone": phone,
                    "website": website,
                    "country": country,
                    "company_type": "freight forwarder",
                    "source": "freightcourse",
                })
        return leads

    # ── Helper ────────────────────────────────────────────────────────────────

    def _text(self, soup: BeautifulSoup, selector: str) -> str:
        tag = soup.select_one(selector)
        return tag.get_text(strip=True) if tag else ""
