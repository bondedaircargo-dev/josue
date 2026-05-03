"""
Search Module: busca URLs candidatas usando Google Custom Search, SerpAPI o DuckDuckGo.
"""
import requests
import time
from typing import List
from config import GOOGLE_API_KEY, GOOGLE_CSE_ID, SERPAPI_KEY, MAX_URLS_PER_SEARCH
from utils import logger, random_delay


def search_google_cse(keyword: str) -> List[str]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return []
    urls = []
    try:
        resp = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"key": GOOGLE_API_KEY, "cx": GOOGLE_CSE_ID, "q": keyword, "num": 10},
            timeout=10,
        )
        data = resp.json()
        for item in data.get("items", []):
            urls.append(item.get("link", ""))
    except Exception as e:
        logger.warning(f"Google CSE error: {e}")
    return [u for u in urls if u]


def search_serpapi(keyword: str) -> List[str]:
    if not SERPAPI_KEY:
        return []
    urls = []
    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params={"q": keyword, "api_key": SERPAPI_KEY, "engine": "google", "num": 10},
            timeout=10,
        )
        data = resp.json()
        for item in data.get("organic_results", []):
            urls.append(item.get("link", ""))
    except Exception as e:
        logger.warning(f"SerpAPI error: {e}")
    return [u for u in urls if u]


def search_duckduckgo(keyword: str) -> List[str]:
    """Busqueda via DuckDuckGo HTML (no requiere API key)."""
    urls = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        resp = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": keyword},
            headers=headers,
            timeout=15,
        )
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "lxml")
        for a in soup.select("a.result__url"):
            href = a.get("href", "")
            if href and href.startswith("http"):
                urls.append(href)
        if not urls:
            for a in soup.select("a[href]"):
                href = a.get("href", "")
                if "uddg=" in href:
                    import urllib.parse
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                    if "uddg" in parsed:
                        urls.append(parsed["uddg"][0])
    except Exception as e:
        logger.warning(f"DuckDuckGo error: {e}")
    return list(set(urls[:MAX_URLS_PER_SEARCH]))


def search_keyword(keyword: str) -> List[str]:
    """Intenta Google CSE -> SerpAPI -> DuckDuckGo en orden."""
    logger.info(f"Buscando: {keyword}")
    urls = search_google_cse(keyword)
    if not urls:
        urls = search_serpapi(keyword)
    if not urls:
        urls = search_duckduckgo(keyword)
    logger.info(f"  -> {len(urls)} URLs encontradas")
    random_delay()
    return urls[:MAX_URLS_PER_SEARCH]


def search_all_keywords(keywords: List[str]) -> List[str]:
    all_urls = []
    seen = set()
    for kw in keywords:
        for url in search_keyword(kw):
            if url not in seen:
                seen.add(url)
                all_urls.append(url)
        time.sleep(1)
    logger.info(f"Total URLs unicas encontradas: {len(all_urls)}")
    return all_urls
