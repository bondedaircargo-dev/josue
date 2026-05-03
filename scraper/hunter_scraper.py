"""
Hunter.io integration — email discovery by domain.

Free tier: 25 searches/month.
Set HUNTER_API_KEY in .env to enable.

Usage:
  scraper = HunterScraper()
  emails = scraper.find_emails("acmefreight.com")
"""

import logging
from config.settings import HUNTER_API_KEY
from scraper.utils import make_session, polite_sleep

logger = logging.getLogger(__name__)


class HunterScraper:
    BASE = "https://api.hunter.io/v2"

    def __init__(self):
        self.session = make_session()
        self.enabled = bool(HUNTER_API_KEY)
        if not self.enabled:
            logger.info("Hunter.io disabled — set HUNTER_API_KEY to enable.")

    def enrich_leads(self, leads: list[dict]) -> list[dict]:
        """
        For each lead without an email, attempt to discover one via Hunter.io.
        Returns the same list with emails filled in where found.
        """
        if not self.enabled:
            return leads

        enriched = []
        for lead in leads:
            if not lead.get("email") and lead.get("website"):
                domain = lead["website"].replace("https://", "").replace("http://", "").split("/")[0]
                emails = self.find_emails(domain)
                if emails:
                    lead["email"] = emails[0]["value"]
                    lead["all_emails"] = "; ".join(e["value"] for e in emails)
                    logger.info("Hunter found %s for %s", lead["email"], domain)
                polite_sleep(2, 4)
            enriched.append(lead)
        return enriched

    def find_emails(self, domain: str) -> list[dict]:
        """Return list of {value, first_name, last_name, position} dicts."""
        try:
            resp = self.session.get(
                f"{self.BASE}/domain-search",
                params={"domain": domain, "api_key": HUNTER_API_KEY, "limit": 5},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", {}).get("emails", [])
        except Exception as exc:
            logger.debug("Hunter error for %s: %s", domain, exc)
            return []

    def verify_email(self, email: str) -> bool:
        """Return True if Hunter considers the email valid."""
        if not self.enabled:
            return True
        try:
            resp = self.session.get(
                f"{self.BASE}/email-verifier",
                params={"email": email, "api_key": HUNTER_API_KEY},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            status = data.get("data", {}).get("status", "unknown")
            return status in ("valid", "accept_all")
        except Exception:
            return True  # assume valid if we can't check
