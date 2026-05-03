#!/usr/bin/env python3
"""
send_emails.py — Email campaign runner.

Usage:
    python send_emails.py                           # send to all leads with emails
    python send_emails.py --dry-run                 # preview without sending
    python send_emails.py --template partnership    # force a specific template
    python send_emails.py --country China           # only send to Chinese leads
    python send_emails.py --type "freight forwarder"
    python send_emails.py --batch 20                # send only 20 this session
    python send_emails.py --test you@email.com      # send test email to yourself
    python send_emails.py --stats                   # show sending stats only
"""

import argparse
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent))

from config.settings import LOG_DIR, EMAIL_LOG
from scraper.lead_collector import LeadCollector
from emails.email_sender import EmailSender

# ── Logging ───────────────────────────────────────────────────────────────────

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "email_sender.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("send_emails")


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Email campaign sender for Bonded Air Cargo")
    p.add_argument("--dry-run",   action="store_true",
                   help="Preview mode — no emails sent")
    p.add_argument("--template",  default=None,
                   choices=["logistics_offer", "partnership", "short_intro"],
                   help="Force template (default: auto-selected per lead)")
    p.add_argument("--country",   default=None,
                   help="Filter leads by country (e.g. 'China', 'USA')")
    p.add_argument("--type",      default=None,
                   help="Filter by company type (e.g. 'freight forwarder')")
    p.add_argument("--batch",     type=int, default=None,
                   help="Max emails to send this session")
    p.add_argument("--test",      default=None, metavar="EMAIL",
                   help="Send a single test email to this address")
    p.add_argument("--stats",     action="store_true",
                   help="Show campaign stats and exit")
    p.add_argument("--leads-file", default=None,
                   help="Path to a custom CSV leads file")
    p.add_argument("--verbose",   action="store_true")
    return p.parse_args()


# ── Stats helper ──────────────────────────────────────────────────────────────

def show_stats():
    import csv
    from collections import Counter

    if not EMAIL_LOG.exists():
        print("No email log found. Run a campaign first.")
        return

    rows = []
    with open(EMAIL_LOG, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    total   = len(rows)
    sent    = sum(1 for r in rows if r["status"] == "sent")
    failed  = sum(1 for r in rows if r["status"] == "failed")
    tmpls   = Counter(r["template"] for r in rows if r["status"] == "sent")

    print("\n" + "=" * 50)
    print("EMAIL CAMPAIGN STATS")
    print("=" * 50)
    print(f"  Total attempts : {total}")
    print(f"  Sent           : {sent}")
    print(f"  Failed         : {failed}")
    print(f"  Success rate   : {sent/total*100:.1f}%" if total else "  No data")
    print("\n  By template:")
    for tmpl, count in tmpls.most_common():
        print(f"    {tmpl:<20} {count}")
    print("=" * 50 + "\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.stats:
        show_stats()
        return

    sender = EmailSender(dry_run=args.dry_run)

    # Test mode — send single email to yourself
    if args.test:
        print(f"\nSending test email to: {args.test}")
        success = sender.send_single(
            to_email=args.test,
            company_name="Test Company",
            template_name=args.template or "short_intro",
        )
        print("✅ Test email sent!" if success else "❌ Test email failed — check logs.")
        return

    # Load leads
    leads_path = Path(args.leads_file) if args.leads_file else None
    leads = LeadCollector.load_leads(leads_path)

    if not leads:
        print("❌ No leads found. Run run_scraper.py first.")
        return

    total_with_email = sum(1 for l in leads if l.get("email"))
    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Loaded {len(leads)} leads "
          f"({total_with_email} with email)")
    if args.country:
        print(f"  Filter country : {args.country}")
    if args.type:
        print(f"  Filter type    : {args.type}")
    if args.template:
        print(f"  Template       : {args.template}")
    print()

    stats = sender.send_campaign(
        leads=leads,
        template_name=args.template,
        batch_size=args.batch,
        filter_country=args.country,
        filter_type=args.type,
    )

    print("\n" + "=" * 50)
    print("CAMPAIGN COMPLETE")
    print("=" * 50)
    print(f"  Sent    : {stats['sent']}")
    print(f"  Skipped : {stats['skipped']}  (already sent)")
    print(f"  Failed  : {stats['failed']}")
    print(f"  Log     : {EMAIL_LOG}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
