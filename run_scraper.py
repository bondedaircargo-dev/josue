#!/usr/bin/env python3
"""
run_scraper.py — Main lead collection runner.

Usage:
    python run_scraper.py                       # full run (all scrapers)
    python run_scraper.py --google-only         # only Google scraper
    python run_scraper.py --dirs-only           # only directory scrapers
    python run_scraper.py --max-queries 5       # limit Google queries (fast test)
    python run_scraper.py --no-hunter           # skip Hunter.io enrichment
"""

import argparse
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in path
sys.path.insert(0, str(Path(__file__).parent))

from config.settings import LOG_DIR, LEADS_CSV
from scraper.lead_collector import LeadCollector

# ── Logging ───────────────────────────────────────────────────────────────────

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "scraper.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("run_scraper")


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Lead collection runner for Bonded Air Cargo")
    p.add_argument("--google-only", action="store_true",  help="Run only Google scraper")
    p.add_argument("--dirs-only",   action="store_true",  help="Run only directory scrapers")
    p.add_argument("--no-hunter",   action="store_true",  help="Skip Hunter.io enrichment")
    p.add_argument("--max-queries", type=int, default=None,
                   help="Limit number of Google search queries (useful for testing)")
    p.add_argument("--verbose",     action="store_true",  help="Debug logging")
    return p.parse_args()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    use_google      = not args.dirs_only
    use_directories = not args.google_only
    use_hunter      = not args.no_hunter

    logger.info("=" * 60)
    logger.info("Bonded Air Cargo — Lead Collector")
    logger.info("Google=%s  Directories=%s  Hunter=%s", use_google, use_directories, use_hunter)
    if args.max_queries:
        logger.info("Max Google queries: %d", args.max_queries)
    logger.info("=" * 60)

    collector = LeadCollector(
        use_google=use_google,
        use_directories=use_directories,
        use_hunter=use_hunter,
    )

    leads = collector.run(max_google_queries=args.max_queries)

    # Summary
    with_email    = sum(1 for l in leads if l.get("email"))
    by_country    = {}
    for l in leads:
        c = l.get("country", "Unknown")
        by_country[c] = by_country.get(c, 0) + 1

    logger.info("\n%s", "=" * 60)
    logger.info("RESULTS SUMMARY")
    logger.info("  Total leads   : %d", len(leads))
    logger.info("  With email    : %d", with_email)
    logger.info("  By country    :")
    for country, count in sorted(by_country.items(), key=lambda x: -x[1]):
        logger.info("    %-15s %d", country, count)
    logger.info("  Saved to      : %s", LEADS_CSV)
    logger.info("=" * 60)

    print(f"\n✅ Done! {len(leads)} leads saved to {LEADS_CSV}")
    print(f"   {with_email} leads have emails and are ready for the email campaign.\n")


if __name__ == "__main__":
    main()
