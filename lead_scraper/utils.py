import re
import time
import random
import logging
from config import DELAY_MIN, DELAY_MAX, LOG_LEVEL

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("data/scraper.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("lead_scraper")


def random_delay():
    delay = random.uniform(DELAY_MIN, DELAY_MAX)
    time.sleep(delay)


def extract_emails(text: str) -> list:
    pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    return list(set(re.findall(pattern, text)))


def extract_phones(text: str) -> list:
    patterns = [
        r"\+?1?\s*[\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}",
        r"\+\d{1,3}[\s\-.]?\d{2,4}[\s\-.]?\d{2,4}[\s\-.]?\d{2,4}",
        r"\(\d{3}\)\s*\d{3}[\s\-.]?\d{4}",
    ]
    phones = []
    for p in patterns:
        phones.extend(re.findall(p, text))
    cleaned = []
    for ph in phones:
        digits = re.sub(r"\D", "", ph)
        if 7 <= len(digits) <= 15:
            cleaned.append(ph.strip())
    return list(set(cleaned))


def extract_whatsapp(text: str, html: str = "") -> str:
    wa_patterns = [
        r"wa\.me/(\+?\d{7,15})",
        r"api\.whatsapp\.com/send\?phone=(\+?\d{7,15})",
        r"whatsapp[:\s]+(\+?\d[\d\s\-\.]{6,14}\d)",
    ]
    for pattern in wa_patterns:
        match = re.search(pattern, html + " " + text, re.IGNORECASE)
        if match:
            return match.group(1)
    return ""


def extract_social_links(html: str) -> dict:
    socials = {}
    patterns = {
        "instagram": r"instagram\.com/([A-Za-z0-9_.]+)",
        "facebook": r"facebook\.com/([A-Za-z0-9_.]+)",
        "tiktok": r"tiktok\.com/@([A-Za-z0-9_.]+)",
        "linkedin": r"linkedin\.com/(?:company|in)/([A-Za-z0-9_\-]+)",
        "twitter": r"(?:twitter|x)\.com/([A-Za-z0-9_]+)",
    }
    for platform, pat in patterns.items():
        match = re.search(pat, html, re.IGNORECASE)
        if match:
            socials[platform] = match.group(0)
    return socials


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:5000]


def normalize_url(url: str) -> str:
    if not url.startswith("http"):
        url = "https://" + url
    return url.rstrip("/")


def get_domain(url: str) -> str:
    match = re.search(r"(?:https?://)?(?:www\.)?([^/\s]+)", url)
    return match.group(1) if match else url
