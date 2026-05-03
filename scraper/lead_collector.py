"""
Lead Collector — orchestrates all scrapers and saves results.

Output formats:
  - data/leads.csv
  - data/leads.json
  - Google Sheets (optional, if GSHEETS_ENABLED=true)
"""

import csv
import json
import logging
from datetime import datetime
from pathlib import Path

from config.settings import (
    DATA_DIR, LEADS_CSV, LEADS_JSON,
    HIGH_VALUE_KEYWORDS, GSHEETS_ENABLED,
)
from scraper.google_scraper import GoogleScraper
from scraper.directory_scraper import DirectoryScraper
from scraper.hunter_scraper import HunterScraper
from scraper.utils import deduplicate_leads, score_lead

logger = logging.getLogger(__name__)

CSV_FIELDS = [
    "company_name", "email", "all_emails", "phone",
    "website", "country", "company_type", "source",
    "score", "scraped_at",
]


class LeadCollector:
    def __init__(self, use_google: bool = True, use_directories: bool = True,
                 use_hunter: bool = True):
        self.use_google      = use_google
        self.use_directories = use_directories
        self.use_hunter      = use_hunter

    def run(self, max_google_queries: int = None) -> list[dict]:
        """
        Full collection pipeline.
        Returns sorted list of enriched, deduplicated leads.
        """
        leads: list[dict] = []

        if self.use_google:
            logger.info("=== Search Scraper (DuckDuckGo/SerpAPI) ===")
            gs = GoogleScraper()
            from scraper.google_scraper import SEARCH_QUERIES
            queries = SEARCH_QUERIES[:max_google_queries] if max_google_queries else SEARCH_QUERIES
            logger.info("Running %d search queries...", len(queries))
            new_leads = gs.collect_leads(queries=queries)
            leads += new_leads
            logger.info("Search: %d raw leads found", len(new_leads))
            # Save partial results immediately so nothing is lost
            if new_leads:
                self._save(leads)

        if self.use_directories:
            logger.info("=== Directory Scraper ===")
            ds = DirectoryScraper()
            dir_leads = ds.collect_leads()
            leads += dir_leads
            logger.info("Directories: %d raw leads", len(dir_leads))

        # Enrich with Hunter.io (fill missing emails by domain)
        if self.use_hunter:
            logger.info("=== Hunter.io enrichment ===")
            hs = HunterScraper()
            leads = hs.enrich_leads(leads)

        # Score, dedup, sort
        now = datetime.utcnow().isoformat()
        for lead in leads:
            lead["score"]      = score_lead(lead, HIGH_VALUE_KEYWORDS)
            lead["scraped_at"] = now

        leads = deduplicate_leads(leads)
        leads.sort(key=lambda x: x["score"], reverse=True)

        logger.info("Total unique leads: %d", len(leads))
        self._save(leads)

        if GSHEETS_ENABLED:
            self._save_gsheets(leads)

        return leads

    # ── Save helpers ──────────────────────────────────────────────────────────

    def _save(self, leads: list[dict]) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        # CSV
        with open(LEADS_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(leads)
        logger.info("Saved %d leads → %s", len(leads), LEADS_CSV)

        # JSON
        with open(LEADS_JSON, "w", encoding="utf-8") as f:
            json.dump(leads, f, ensure_ascii=False, indent=2)
        logger.info("Saved %d leads → %s", len(leads), LEADS_JSON)

    def _save_gsheets(self, leads: list[dict]) -> None:
        try:
            import gspread
            from google.oauth2.service_account import Credentials
            from config.settings import GSHEETS_CREDENTIALS, GSHEETS_SPREADSHEET

            scopes = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive",
            ]
            creds = Credentials.from_service_account_file(GSHEETS_CREDENTIALS, scopes=scopes)
            client = gspread.authorize(creds)

            try:
                sheet = client.open(GSHEETS_SPREADSHEET).sheet1
            except gspread.SpreadsheetNotFound:
                sheet = client.create(GSHEETS_SPREADSHEET).sheet1

            # Write header + rows
            rows = [CSV_FIELDS] + [
                [str(lead.get(f, "")) for f in CSV_FIELDS] for lead in leads
            ]
            sheet.clear()
            sheet.update(rows)
            logger.info("Google Sheets updated: %s", GSHEETS_SPREADSHEET)

        except ImportError:
            logger.warning("gspread not installed. Run: pip install gspread google-auth")
        except Exception as exc:
            logger.error("Google Sheets error: %s", exc)

    # ── Load saved leads ──────────────────────────────────────────────────────

    @staticmethod
    def load_leads(filepath: Path = None) -> list[dict]:
        """Load leads from CSV. Used by the email sender."""
        filepath = filepath or LEADS_CSV
        if not filepath.exists():
            logger.warning("No leads file at %s", filepath)
            return []
        leads = []
        with open(filepath, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                leads.append(row)
        return leads
