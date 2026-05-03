#!/usr/bin/env python3
"""
import_leads.py — Import leads manually from your own CSV or add one by one.

Usage:
    # Add a single lead interactively
    python import_leads.py --add

    # Import from an existing CSV file (any format)
    python import_leads.py --file mis_contactos.csv

    # Show current leads count
    python import_leads.py --count

CSV column mapping (flexible — script will auto-detect):
    company / company_name / nombre empresa
    email / correo / e-mail
    phone / telefono / tel
    website / web / url
    country / pais
    type / company_type / tipo
"""

import argparse
import csv
import json
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent))

from config.settings import DATA_DIR, LEADS_CSV, LEADS_JSON
from scraper.lead_collector import LeadCollector, CSV_FIELDS
from scraper.utils import deduplicate_leads, score_lead
from config.settings import HIGH_VALUE_KEYWORDS


# ── Column name aliases ────────────────────────────────────────────────────────

ALIASES = {
    "company_name": ["company_name", "company", "empresa", "nombre", "name", "business"],
    "email":        ["email", "correo", "e-mail", "mail", "email address"],
    "phone":        ["phone", "telefono", "tel", "phone number", "celular"],
    "website":      ["website", "web", "url", "site", "pagina"],
    "country":      ["country", "pais", "país", "location", "ubicacion"],
    "company_type": ["company_type", "type", "tipo", "category", "industria"],
}


def map_columns(headers: list) -> dict:
    """Return {canonical_field: csv_column} mapping."""
    headers_lower = {h.strip().lower(): h for h in headers}
    mapping = {}
    for field, aliases in ALIASES.items():
        for alias in aliases:
            if alias in headers_lower:
                mapping[field] = headers_lower[alias]
                break
    return mapping


def normalize_lead(row: dict, col_map: dict) -> dict:
    lead = {f: "" for f in CSV_FIELDS}
    for field, col in col_map.items():
        lead[field] = row.get(col, "").strip()
    lead["source"] = "manual"
    lead["score"]  = score_lead(lead, HIGH_VALUE_KEYWORDS)
    return lead


def load_existing() -> list:
    return LeadCollector.load_leads()


def save_all(leads: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    leads = deduplicate_leads(leads)
    leads.sort(key=lambda x: int(x.get("score", 0)), reverse=True)

    with open(LEADS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(leads)

    with open(LEADS_JSON, "w", encoding="utf-8") as f:
        json.dump(leads, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(leads)} leads saved to {LEADS_CSV}")


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_add():
    """Add a single lead interactively."""
    print("\n── Add a new lead ──────────────────────────────")
    lead = {f: "" for f in CSV_FIELDS}
    lead["company_name"] = input("Company name : ").strip()
    lead["email"]        = input("Email        : ").strip().lower()
    lead["phone"]        = input("Phone        : ").strip()
    lead["website"]      = input("Website      : ").strip()
    lead["country"]      = input("Country      : ").strip()
    lead["company_type"] = input("Type (e.g. freight forwarder, supplier): ").strip()
    lead["source"]       = "manual"
    lead["score"]        = score_lead(lead, HIGH_VALUE_KEYWORDS)

    existing = load_existing()
    existing.append(lead)
    save_all(existing)


def cmd_import(filepath: str):
    """Import leads from a CSV file."""
    path = Path(filepath)
    if not path.exists():
        print(f"❌ File not found: {filepath}")
        return

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        col_map = map_columns(headers)

        if not col_map:
            print(f"❌ Could not detect columns. Headers found: {headers}")
            print("   Rename columns to: company_name, email, phone, website, country, company_type")
            return

        print(f"Column mapping: {col_map}")
        new_leads = [normalize_lead(row, col_map) for row in reader]

    with_email = sum(1 for l in new_leads if l.get("email"))
    print(f"\nFound {len(new_leads)} rows ({with_email} with email)")

    existing = load_existing()
    before = len(existing)
    combined = existing + new_leads
    save_all(combined)
    after_dedup = before + len(new_leads)
    print(f"Previous leads: {before}  |  Added: {len(new_leads)}  |  Total after dedup: see file")


def cmd_count():
    leads = load_existing()
    with_email = sum(1 for l in leads if l.get("email"))
    by_country = {}
    for l in leads:
        c = l.get("country", "Unknown")
        by_country[c] = by_country.get(c, 0) + 1

    print(f"\n── Lead Database ───────────────────────────────")
    print(f"  Total leads  : {len(leads)}")
    print(f"  With email   : {with_email}")
    print(f"  By country   :")
    for c, n in sorted(by_country.items(), key=lambda x: -x[1]):
        print(f"    {c:<15} {n}")
    print(f"  File: {LEADS_CSV}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Manually manage the leads database")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--add",   action="store_true", help="Add a single lead interactively")
    g.add_argument("--file",  metavar="CSV_FILE",  help="Import from a CSV file")
    g.add_argument("--count", action="store_true", help="Show leads count and stats")
    args = p.parse_args()

    if args.add:
        cmd_add()
    elif args.file:
        cmd_import(args.file)
    elif args.count:
        cmd_count()


if __name__ == "__main__":
    main()
