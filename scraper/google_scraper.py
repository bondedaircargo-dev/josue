"""
Search scraper — multi-engine with fallback chain:

  1. SerpAPI      (if SERPAPI_KEY set) — most reliable
  2. DuckDuckGo   — no blocks, no login required, generous rate limits
  3. Google       — last resort, may get blocked

For each result URL the page is fetched and scraped for:
  business name · emails · phone numbers · website
"""

import logging
import re
import time
import random
from urllib.parse import quote_plus, urlencode

import requests
from bs4 import BeautifulSoup

from config.settings import (
    SERPAPI_KEY, MAX_RESULTS_PER_QUERY, GOOGLE_PAGE_DELAY,
    TARGET_COUNTRIES, TARGET_CITIES, COMPANY_TYPES,
)
from scraper.utils import make_session, polite_sleep, extract_emails, normalize_phone

logger = logging.getLogger(__name__)

_PHONE_RE = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")

# ── Search queries ─────────────────────────────────────────────────────────────

SEARCH_QUERIES = []
for _country in TARGET_COUNTRIES:
    _cities = TARGET_CITIES.get(_country, [_country])
    for _city in _cities[:2]:          # limit city combinations
        for _ctype in COMPANY_TYPES[:5]:
            SEARCH_QUERIES.append(f'{_ctype} {_city} email contact')

SEARCH_QUERIES += [
    'freight forwarder Miami "Dominican Republic" email contact',
    'logistics Miami Haiti freight email',
    'freight forwarder Shenzhen export email contact',
    'warehouse "Los Angeles" "Latin America" logistics email',
    'exporter Vietnam clothing electronics email contact',
    'supplier Yiwu export email contact',
    'logistics Canada Caribbean shipping email',
    'freight forwarder Miami Caribbean email',
    'customs broker Miami Dominican Republic email',
    'air freight Miami Caribbean contact',
    'freight forwarder Guangzhou export email',
    'shipping company Vietnam international email',
    'logistics company Toronto international freight email',
    'warehouse Miami international shipping email',
    'freight forwarder New York Caribbean email',
]


class GoogleScraper:
    def __init__(self):
        self.session = make_session()

    # ── Public API ─────────────────────────────────────────────────────────────

    def collect_leads(self, queries: list = None, max_per_query: int = 8) -> list:
        queries = queries or SEARCH_QUERIES
        all_leads = []

        for i, query in enumerate(queries, 1):
            logger.info("[Search %d/%d] %s", i, len(queries), query)
            try:
                if SERPAPI_KEY:
                    urls = self._serpapi_urls(query, max_per_query)
                else:
                    urls = self._duckduckgo_urls(query, max_per_query)

                for url in urls:
                    lead = self._scrape_page(url)
                    if lead:
                        all_leads.append(lead)
                    polite_sleep(1, 3)

            except Exception as exc:
                logger.warning("Query failed: %s — %s", query, exc)

            polite_sleep(4, 8)

        return all_leads

    # ── SerpAPI ───────────────────────────────────────────────────────────────

    def _serpapi_urls(self, query: str, num: int) -> list:
        params = {"q": query, "num": num, "api_key": SERPAPI_KEY, "engine": "google"}
        resp = self.session.get("https://serpapi.com/search", params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return [r["link"] for r in data.get("organic_results", []) if "link" in r]

    # ── DuckDuckGo (no API key needed, rarely blocks) ─────────────────────────

    def _duckduckgo_urls(self, query: str, num: int) -> list:
        """
        Uses DuckDuckGo HTML search — no JS needed, no captcha for low volume.
        Returns up to `num` result URLs.
        """
        urls = []
        headers = {
            "User-Agent": random.choice([
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
                "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
            ]),
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            resp = requests.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query, "kl": "us-en"},
                headers=headers,
                timeout=20,
            )
            if resp.status_code != 200:
                logger.warning("DuckDuckGo returned %s", resp.status_code)
                return []

            soup = BeautifulSoup(resp.text, "html.parser")

            for a in soup.select("a.result__a"):
                href = a.get("href", "")
                if href.startswith("http") and "duckduckgo.com" not in href:
                    urls.append(href)
                if len(urls) >= num:
                    break

            logger.debug("DuckDuckGo: %d URLs for '%s'", len(urls), query[:60])

        except Exception as exc:
            logger.warning("DuckDuckGo error: %s", exc)

        return urls

    # ── Page scraper ──────────────────────────────────────────────────────────

    def _scrape_page(self, url: str) -> dict | None:
        try:
            resp = self.session.get(url, timeout=15)
            resp.raise_for_status()
        except Exception as exc:
            logger.debug("Could not fetch %s: %s", url, exc)
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text(separator=" ", strip=True)

        emails = extract_emails(text)
        if not emails:
            for a in soup.select("a[href^='mailto:']"):
                emails += extract_emails(a["href"].replace("mailto:", ""))

        # Also check contact page if no emails found
        if not emails:
            contact_url = self._find_contact_url(soup, url)
            if contact_url:
                emails = self._scrape_emails_from_url(contact_url)

        phones = _PHONE_RE.findall(text)
        phones = [normalize_phone(p) for p in phones[:3] if len(p) >= 7]

        name    = self._extract_company_name(soup)
        country = self._guess_country(text, url)
        ctype   = self._guess_company_type(text)

        if not (name or emails):
            return None

        return {
            "company_name": name,
            "email":        emails[0] if emails else "",
            "all_emails":   "; ".join(emails),
            "phone":        phones[0] if phones else "",
            "website":      url,
            "country":      country,
            "company_type": ctype,
            "source":       "duckduckgo" if not SERPAPI_KEY else "serpapi",
        }

    def _find_contact_url(self, soup: BeautifulSoup, base_url: str) -> str:
        for a in soup.select("a[href]"):
            href = a.get("href", "").lower()
            text = a.get_text(strip=True).lower()
            if "contact" in href or "contact" in text:
                href_full = a["href"]
                if href_full.startswith("http"):
                    return href_full
                if href_full.startswith("/"):
                    from urllib.parse import urlparse
                    parsed = urlparse(base_url)
                    return f"{parsed.scheme}://{parsed.netloc}{href_full}"
        return ""

    def _scrape_emails_from_url(self, url: str) -> list:
        try:
            resp = self.session.get(url, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text(separator=" ", strip=True)
            emails = extract_emails(text)
            for a in soup.select("a[href^='mailto:']"):
                emails += extract_emails(a["href"].replace("mailto:", ""))
            return list(dict.fromkeys(emails))
        except Exception:
            return []

    def _extract_company_name(self, soup: BeautifulSoup) -> str:
        for sel in ["meta[property='og:site_name']", "title", "h1"]:
            tag = soup.select_one(sel)
            if tag:
                text = tag.get("content") or tag.get_text(strip=True)
                if text and len(text) < 80:
                    return text.split("|")[0].split("–")[0].split("-")[0].strip()
        return ""

    def _guess_country(self, text: str, url: str) -> str:
        t = (text + url).lower()
        mapping = {
            "China":   ["china", "shenzhen", "guangzhou", "shanghai", "yiwu", ".cn"],
            "USA":     ["united states", "usa", "miami", "los angeles", "new york"],
            "Vietnam": ["vietnam", "ho chi minh", "hanoi", "haiphong", ".vn"],
            "Canada":  ["canada", "toronto", "vancouver", "montreal", ".ca"],
        }
        for country, kws in mapping.items():
            if any(kw in t for kw in kws):
                return country
        return "Unknown"

    def _guess_company_type(self, text: str) -> str:
        t = text.lower()
        checks = [
            ("freight forwarder", ["freight forwarder", "forwarding agent"]),
            ("warehouse",         ["warehouse", "storage", "fulfillment center"]),
            ("logistics",         ["logistics", "supply chain", "3pl"]),
            ("exporter",          ["exporter", "export company"]),
            ("supplier",          ["supplier", "manufacturer", "factory"]),
            ("customs broker",    ["customs broker", "customs clearance"]),
            ("importer",          ["importer", "import"]),
        ]
        for label, kws in checks:
            if any(kw in t for kw in kws):
                return label
        return "logistics"
