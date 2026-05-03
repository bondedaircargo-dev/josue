"""
Shared utilities: HTTP session factory, email extractor, delay helper, dedup.
"""

import re
import random
import time
import logging
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config.settings import USER_AGENTS, REQUEST_DELAY_MIN, REQUEST_DELAY_MAX

logger = logging.getLogger(__name__)

# Regex that catches most real-world email formats
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

# Domains to skip (generic / not business emails)
_SKIP_DOMAINS = {
    "example.com", "sentry.io", "wixpress.com", "squarespace.com",
    "wordpress.com", "shopify.com", "1234.com", "domain.com",
    "yourdomain.com", "email.com", "test.com",
}


def make_session(retries: int = 3) -> requests.Session:
    """Return a requests Session with retry logic and a random User-Agent."""
    session = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    return session


def polite_sleep(min_s: float = None, max_s: float = None) -> None:
    """Sleep a random duration to mimic human browsing speed."""
    lo = min_s if min_s is not None else REQUEST_DELAY_MIN
    hi = max_s if max_s is not None else REQUEST_DELAY_MAX
    delay = random.uniform(lo, hi)
    logger.debug("Sleeping %.1fs", delay)
    time.sleep(delay)


def extract_emails(text: str) -> list[str]:
    """Extract and filter valid-looking emails from arbitrary text."""
    found = _EMAIL_RE.findall(text)
    clean = []
    for email in found:
        domain = email.split("@")[1].lower()
        if domain not in _SKIP_DOMAINS and not domain.startswith("png"):
            clean.append(email.lower())
    return list(dict.fromkeys(clean))  # deduplicate, preserve order


def extract_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lstrip("www.")
    except Exception:
        return ""


def normalize_phone(raw: str) -> str:
    """Strip everything except digits and leading +."""
    digits = re.sub(r"[^\d+]", "", raw)
    return digits if len(digits) >= 7 else ""


def deduplicate_leads(leads: list[dict]) -> list[dict]:
    """Remove duplicate leads based on email. Keeps first occurrence."""
    seen_emails: set[str] = set()
    seen_websites: set[str] = set()
    result = []
    for lead in leads:
        email   = lead.get("email", "").strip().lower()
        website = lead.get("website", "").strip().lower()

        if email and email in seen_emails:
            continue
        if not email and website and website in seen_websites:
            continue

        if email:
            seen_emails.add(email)
        if website:
            seen_websites.add(website)
        result.append(lead)
    return result


def score_lead(lead: dict, high_value_keywords: list[str]) -> int:
    """
    Simple priority score (0-100).
    Higher = more likely to be a useful B2B contact.
    """
    score = 0
    text = " ".join(str(v) for v in lead.values()).lower()

    if lead.get("email"):
        score += 40
    if lead.get("phone"):
        score += 10
    if lead.get("website"):
        score += 10
    for kw in high_value_keywords:
        if kw.lower() in text:
            score += 5
    return min(score, 100)
