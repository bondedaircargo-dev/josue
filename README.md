# Lead Finder & Email Automation
### Bonded Air Cargo — International Logistics

Automated system to find freight/logistics leads (China, USA, Vietnam, Canada) and
send personalized cold emails offering our Miami ↔ Dominican Republic / Haiti services.

---

## Project Structure

```
josue/
├── scraper/
│   ├── google_scraper.py      # Google search scraping + SerpAPI
│   ├── directory_scraper.py   # ThomasNet, ImportYeti, Kompass, FreightCourse
│   ├── hunter_scraper.py      # Hunter.io email discovery
│   ├── lead_collector.py      # Orchestrator — runs all scrapers, saves results
│   └── utils.py               # Shared helpers (HTTP, email extraction, dedup)
├── emails/
│   ├── email_sender.py        # SMTP sender, campaign runner, send log
│   └── template_engine.py     # Jinja2 template loader + auto-selection
├── data/
│   ├── leads.csv              # Generated — all collected leads
│   └── leads.json             # Generated — same data in JSON
├── templates/
│   ├── logistics_offer.html/txt    # For exporters/suppliers in Asia
│   ├── partnership.html/txt        # For freight forwarders (B2B partner pitch)
│   └── short_intro.html/txt        # Short warm-style intro for any lead
├── logs/
│   ├── scraper.log            # Generated — scraper activity
│   ├── email_sender.log       # Generated — email activity
│   └── email_log.csv          # Generated — per-email send record
├── config/
│   └── settings.py            # Central config (targets, delays, paths)
├── run_scraper.py             # CLI — collect leads
├── send_emails.py             # CLI — run email campaign
├── requirements.txt
└── .env.example
```

---

## Installation

**Requirements:** Python 3.11+

```bash
# 1. Clone the repo
git clone https://github.com/bondedaircargo-dev/josue.git
cd josue

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your real credentials (see Configuration section)
```

---

## Configuration

Edit `.env` with your values:

| Variable | Description | Required |
|---|---|---|
| `EMAIL_USER` | Your Gmail address | ✅ |
| `EMAIL_PASS` | Gmail App Password (not regular password) | ✅ |
| `EMAIL_NAME` | Display name for sent emails | ✅ |
| `SMTP_HOST` | SMTP server (default: `smtp.gmail.com`) | ✅ |
| `SMTP_PORT` | SMTP port (default: `587`) | ✅ |
| `EMAIL_BATCH_SIZE` | Max emails per session (default: `30`) | ✅ |
| `SERPAPI_KEY` | SerpAPI key — better Google results | Optional |
| `HUNTER_API_KEY` | Hunter.io — find emails by domain | Optional |
| `GSHEETS_ENABLED` | Set `true` to export leads to Google Sheets | Optional |
| `GSHEETS_CREDENTIALS` | Path to Google service account JSON | Optional |

### Gmail App Password Setup
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password for "Mail" → "Other (custom name)"
4. Paste the 16-character password into `EMAIL_PASS` in `.env`

---

## How to Collect Leads

```bash
# Full run — all scrapers (Google + directories + Hunter enrichment)
python run_scraper.py

# Only Google search scraper
python run_scraper.py --google-only

# Only directory scrapers (ThomasNet, ImportYeti, Kompass, FreightCourse)
python run_scraper.py --dirs-only

# Quick test — limit to 5 Google queries
python run_scraper.py --max-queries 5

# Skip Hunter.io enrichment (saves API quota)
python run_scraper.py --no-hunter

# Verbose mode for debugging
python run_scraper.py --verbose
```

Results are saved to:
- `data/leads.csv` — spreadsheet-friendly
- `data/leads.json` — for API/CRM integrations

Each lead includes: `company_name`, `email`, `phone`, `website`, `country`,
`company_type`, `source`, `score` (0–100), `scraped_at`.

---

## How to Send Emails

```bash
# Dry run — preview without sending (always test first!)
python send_emails.py --dry-run

# Send to all leads (auto-selects template per lead)
python send_emails.py

# Send only to Chinese leads
python send_emails.py --country China

# Send only to freight forwarders
python send_emails.py --type "freight forwarder"

# Force a specific template
python send_emails.py --template logistics_offer

# Limit to 20 emails this session
python send_emails.py --batch 20

# Send a test email to yourself first
python send_emails.py --test yourname@gmail.com

# View campaign statistics
python send_emails.py --stats
```

### Email Templates

| Template | Best for | Subject line |
|---|---|---|
| `logistics_offer` | Asian suppliers/exporters | Freight & Logistics — Miami to DR/Haiti |
| `partnership` | Freight forwarders, 3PLs | Partnership Opportunity — International Shipping |
| `short_intro` | All other leads | Quick intro — Bonded Air Cargo Miami Logistics |

Templates are in `/templates/` as Jinja2 `.html` + `.txt` files.
Edit them to update pricing, routes, or contact info.

**Key variables available in templates:**
- `{{ company_name }}` — target company name
- `{{ country }}` — lead's country
- `{{ company_type }}` — type of company
- `{{ sender_name }}` — your name/company (from EMAIL_NAME)

---

## Adding New Countries

1. Open `config/settings.py`
2. Add the country to `TARGET_COUNTRIES`:
   ```python
   TARGET_COUNTRIES = ["China", "USA", "Vietnam", "Canada", "Mexico"]
   ```
3. Add cities to `TARGET_CITIES`:
   ```python
   TARGET_CITIES = {
       ...
       "Mexico": ["Mexico City", "Guadalajara", "Monterrey"],
   }
   ```
4. Run `python run_scraper.py` — it will automatically generate search queries.

---

## Adding New Search Queries

Open `scraper/google_scraper.py` and add to `SEARCH_QUERIES`:

```python
SEARCH_QUERIES += [
    '"freight forwarder" "Mexico City" email contact',
    '"logistics" "Guadalajara" "Caribbean" email',
]
```

---

## Anti-Block Protections

The scraper includes multiple layers to avoid bans:

- **Random delays** between requests (3–8s) and between Google pages (10–15s)
- **User-Agent rotation** — 4 real browser fingerprints
- **Retry logic** — exponential backoff on 429/5xx errors
- **Polite rate limiting** for email sends (30–90s between emails)
- **Idempotent email log** — never re-sends to the same address

---

## Email Safety Best Practices

| Do | Don't |
|---|---|
| Send 30–50 emails/day | Send 200+ in one session |
| Use `--batch 30` flag | Skip the batch limit |
| Always test with `--dry-run` first | Send untested templates |
| Personalize with company name | Send generic bulk blasts |
| Space out campaigns (daily) | Run back-to-back campaigns |

---

## Optional: Google Sheets Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Sheets API** and **Google Drive API**
3. Create a **Service Account** → Download JSON credentials
4. Place the JSON file in the project root
5. Update `.env`:
   ```
   GSHEETS_ENABLED=true
   GSHEETS_CREDENTIALS=credentials.json
   GSHEETS_SPREADSHEET=Leads - Bonded Air Cargo
   ```
6. Share the Google Sheet with the service account email
7. Run the scraper — leads export automatically

---

## Optional: n8n Webhook Integration

After scraping, POST leads to an n8n workflow:

```python
import requests, json
from scraper.lead_collector import LeadCollector

leads = LeadCollector.load_leads()
requests.post("https://your-n8n-instance.com/webhook/leads",
              json={"leads": leads[:10]})
```

---

## Logs

| File | Contents |
|---|---|
| `logs/scraper.log` | Scraper activity, errors, URLs visited |
| `logs/email_sender.log` | Email send attempts |
| `logs/email_log.csv` | Per-email record: timestamp, status, template |
| `data/leads.csv` | All collected leads |
| `data/leads.json` | Same in JSON |

---

## Troubleshooting

**`No leads found` when running send_emails.py**
→ Run `python run_scraper.py` first to generate `data/leads.csv`

**Gmail authentication fails**
→ Make sure you're using an App Password, not your Gmail password
→ 2FA must be enabled on your Google account

**Google blocks the scraper**
→ Add `SERPAPI_KEY` to `.env` for reliable results
→ Or increase `GOOGLE_PAGE_DELAY` in `config/settings.py`

**Emails go to spam**
→ Warm up your email domain (send 5/day → 10/day → 20/day)
→ Use `--batch 20` initially
→ Make sure SPF/DKIM records are set on your domain

---

## Tech Stack

- **Python 3.11+** — scraping, email sending
- **requests + BeautifulSoup** — HTTP scraping
- **Jinja2** — email templates
- **smtplib** — SMTP email sending
- **python-dotenv** — environment management
- **SerpAPI** (optional) — Google results API
- **Hunter.io** (optional) — email discovery API
- **gspread** (optional) — Google Sheets export
