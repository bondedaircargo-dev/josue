"""
Central configuration for the Lead Finder + Email Automation system.
All tunable parameters live here — no magic numbers elsewhere.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Paths ──────────────────────────────────────────────────────────────────────
DATA_DIR   = BASE_DIR / "data"
LOG_DIR    = BASE_DIR / "logs"
TMPL_DIR   = BASE_DIR / "templates"

LEADS_CSV  = DATA_DIR / "leads.csv"
LEADS_JSON = DATA_DIR / "leads.json"
EMAIL_LOG  = LOG_DIR  / "email_log.csv"
ERROR_LOG  = LOG_DIR  / "errors.log"

# ── Scraper ────────────────────────────────────────────────────────────────────
# Seconds to wait between HTTP requests (be polite, avoid blocks)
REQUEST_DELAY_MIN = 3
REQUEST_DELAY_MAX = 8

# Seconds to wait between Google search pages
GOOGLE_PAGE_DELAY = 10

# Max results per search query
MAX_RESULTS_PER_QUERY = 50

# Browser-like User-Agent pool — rotated per request
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
]

# ── Target markets ─────────────────────────────────────────────────────────────
TARGET_COUNTRIES = ["China", "USA", "Vietnam", "Canada"]

TARGET_CITIES = {
    "USA": ["Miami", "Los Angeles", "New York", "Houston"],
    "China": ["Shenzhen", "Guangzhou", "Shanghai", "Yiwu"],
    "Vietnam": ["Ho Chi Minh City", "Hanoi", "Haiphong"],
    "Canada": ["Vancouver", "Toronto", "Montreal"],
}

COMPANY_TYPES = [
    "freight forwarder",
    "warehouse",
    "logistics company",
    "exporter",
    "supplier electronics",
    "supplier clothing",
    "supplier accessories",
    "importer",
    "customs broker",
    "shipping company",
]

# Extra keywords that raise lead priority
HIGH_VALUE_KEYWORDS = [
    "dominican republic", "haiti", "caribbean", "latin america",
    "miami", "export", "international shipping", "sea freight", "air freight",
]

# ── Email sending ──────────────────────────────────────────────────────────────
SMTP_HOST    = os.getenv("SMTP_HOST",    "smtp.gmail.com")
SMTP_PORT    = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER   = os.getenv("EMAIL_USER",   "")
EMAIL_PASS   = os.getenv("EMAIL_PASS",   "")
EMAIL_NAME   = os.getenv("EMAIL_NAME",   "Bonded Air Cargo")

# Seconds between individual email sends (avoid spam filters)
EMAIL_DELAY_MIN = 30
EMAIL_DELAY_MAX = 90

# Max emails per session
EMAIL_BATCH_SIZE = int(os.getenv("EMAIL_BATCH_SIZE", "50"))

# ── Google Sheets (optional) ───────────────────────────────────────────────────
GSHEETS_ENABLED       = os.getenv("GSHEETS_ENABLED", "false").lower() == "true"
GSHEETS_CREDENTIALS   = os.getenv("GSHEETS_CREDENTIALS", "credentials.json")
GSHEETS_SPREADSHEET   = os.getenv("GSHEETS_SPREADSHEET", "Leads - Bonded Air Cargo")

# ── SerpAPI (optional — higher quality Google results) ────────────────────────
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")

# ── Hunter.io (optional — email discovery) ────────────────────────────────────
HUNTER_API_KEY = os.getenv("HUNTER_API_KEY", "")
