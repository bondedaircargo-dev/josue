"""
Google Search scraper.

Strategy:
  1. If SERPAPI_KEY is set → use SerpAPI (reliable, no blocks, free tier = 100/mo).
  2. Otherwise → scrape Google directly with random delays + User-Agent rotation.

For each result URL, it fetches the page and attempts to extract:
  - Business name
  - Emails
  - Phone numbers
  - Website
"""

import logging
import re
import time
import random
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

from config.settings import (
    SERPAPI_KEY, MAX_RESULTS_PER_QUERY, GOOGLE_PAGE_DELAY,
    TARGET_COUNTRIES, TARGET_CITIES, COMPANY_TYPES,
)
from scraper.utils import make_session, polite_sleep, extract_emails, extract_domain, normalize_phone

logger = logging.getLogger(__name__)

_PHONE_RE = re.compile(
    r"(\+?\d[\d\s\-().]{7,}\d)"
)

SEARCH_QUERIES = []
for country in TARGET_COUNTRIES:
    cities = TARGET_CITIES.get(country, [country])
    for city in cities:
        for ctype in COMPANY_TYPES:
            SEARCH_QUERIES.append(f'"{ctype}" "{city}" email contact site:.com OR site:.net')

# Additional targeted queries
SEARCH_QUERIES += [
    '"freight forwarder" "Miami" "Dominican Republic" email',
    '"logistics" "Miami" "Haiti" contact email',
    '"freight forwarder" "Shenzhen" export contact email',
    '"warehouse" "Los Angeles" "Latin America" contact',
    '"exporter" "Vietnam" "clothing" OR "electronics" email contact',
    '"supplier" "Yiwu" "export" email contact',
    '"logistics" "Canada" "Caribbean" email',
    'site:importyeti.com "Dominican Republic" importer',
    'site:importyeti.com "Haiti" importer shipper',
    '"customs broker" Miami "Dominican Republic" email',
    '"air freight" Miami Caribbean contact email',
]


class GoogleScraper:
    def __init__(self):
        self.session = make_session()

    # ── Public API ─────────────────────────────────────────────────────────────

    def collect_leads(self, queries: list[str] = None, max_per_query: int = 10) -> list[dict]:
        """Run all queries and return deduplicated lead dicts."""
        queries = queries or SEARCH_QUERIES
        all_leads: list[dict] = []

        for i, query in enumerate(queries, 1):
            logger.info("[Google %d/%d] %s", i, len(queries), query)
            try:
                if SERPAPI_KEY:
                    urls = self._serpapi_urls(query, max_per_query)
                else:
                    urls = self._google_urls(query, max_per_query)

                for url in urls:
                    lead = self._scrape_page(url)
                    if lead:
                        all_leads.append(lead)
                    polite_sleep(2, 5)

            except Exception as exc:
                logger.warning("Query failed: %s — %s", query, exc)

            polite_sleep(GOOGLE_PAGE_DELAY, GOOGLE_PAGE_DELAY + 5)

        return all_leads

    # ── SerpAPI path ──────────────────────────────────────────────────────────

    def _serpapi_urls(self, query: str, num: int) -> list[str]:
        params = {
            "q": query,
            "num": num,
            "api_key": SERPAPI_KEY,
            "engine": "google",
        }
        resp = self.session.get("https://serpapi.com/search", params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return [r["link"] for r in data.get("organic_results", []) if "link" in r]

    # ── Direct Google scrape path ─────────────────────────────────────────────

    def _google_urls(self, query: str, num: int) -> list[str]:
        urls: list[str] = []
        start = 0
        per_page = 10

        while len(urls) < num:
            search_url = (
                f"https://www.google.com/search"
                f"?q={quote_plus(query)}&start={start}&num={per_page}&hl=en"
            )
            try:
                resp = self.session.get(search_url, timeout=15)
                if resp.status_code == 429:
                    logger.warning("Google rate-limited. Sleeping 60s.")
                    time.sleep(60)
                    continue
                resp.raise_for_status()
            except requests.RequestException as exc:
                logger.warning("Google request error: %s", exc)
                break

            soup = BeautifulSoup(resp.text, "html.parser")
            found = self._parse_google_results(soup)
            if not found:
                break
            urls.extend(found)
            start += per_page
            polite_sleep(GOOGLE_PAGE_DELAY, GOOGLE_PAGE_DELAY + 5)

        return urls[:num]

    def _parse_google_results(self, soup: BeautifulSoup) -> list[str]:
        urls = []
        # Google wraps result links in <a> tags with href starting with /url?q=
        for a in soup.select("a[href]"):
            href = a["href"]
            if href.startswith("/url?q="):
                url = href[7:].split("&")[0]
                if url.startswith("http") and "google.com" not in url:
                    urls.append(url)
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
            # Try mailto: links
            for a in soup.select("a[href^='mailto:']"):
                emails += extract_emails(a["href"].replace("mailto:", ""))

        phones = _PHONE_RE.findall(text)
        phones = [normalize_phone(p) for p in phones[:3] if len(p) >= 7]

        name = self._extract_company_name(soup)
        country = self._guess_country(text, url)
        ctype = self._guess_company_type(text)

        if not (name or emails):
            return None

        return {
            "company_name": name,
            "email": emails[0] if emails else "",
            "all_emails": "; ".join(emails),
            "phone": phones[0] if phones else "",
            "website": url,
            "country": country,
            "company_type": ctype,
            "source": "google",
        }

    def _extract_company_name(self, soup: BeautifulSoup) -> str:
        for sel in ["title", "h1", "meta[property='og:site_name']"]:
            tag = soup.select_one(sel)
            if tag:
                text = tag.get("content") or tag.get_text(strip=True)
                if text and len(text) < 80:
                    return text.split("|")[0].split("–")[0].strip()
        return ""

    def _guess_country(self, text: str, url: str) -> str:
        text_lower = text.lower() + url.lower()
        mapping = {
            "China": ["china", "shenzhen", "guangzhou", "shanghai", "yiwu", ".cn"],
            "USA":   ["united states", "usa", "miami", "los angeles", "new york", ".com"],
            "Vietnam": ["vietnam", "ho chi minh", "hanoi", "haiphong", ".vn"],
            "Canada": ["canada", "toronto", "vancouver", "montreal", ".ca"],
        }
        for country, keywords in mapping.items():
            if any(kw in text_lower for kw in keywords):
                return country
        return "Unknown"

    def _guess_company_type(self, text: str) -> str:
        text_lower = text.lower()
        types = [
            ("freight forwarder", ["freight forwarder", "forwarding"]),
            ("warehouse",         ["warehouse", "storage", "fulfillment"]),
            ("logistics",         ["logistics", "supply chain", "3pl"]),
            ("exporter",          ["exporter", "export"]),
            ("supplier",          ["supplier", "manufacturer", "factory"]),
            ("customs broker",    ["customs broker", "customs clearance"]),
            ("importer",          ["importer", "import"]),
        ]
        for label, keywords in types:
            if any(kw in text_lower for kw in keywords):
                return label
        return "logistics"
