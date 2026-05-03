"""
Email Sender — SMTP with optional Gmail OAuth2.

Features:
  - Sends HTML + plain-text multipart emails
  - Configurable delay between sends (anti-spam)
  - Per-lead personalization via Jinja2 templates
  - Full CSV log of every send attempt
  - Skips already-sent emails (idempotent)
  - Dry-run mode for testing
"""

import csv
import logging
import random
import smtplib
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from config.settings import (
    SMTP_HOST, SMTP_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_NAME,
    EMAIL_DELAY_MIN, EMAIL_DELAY_MAX, EMAIL_BATCH_SIZE,
    LOG_DIR, EMAIL_LOG,
)
from emails.template_engine import render_template, build_subject, choose_template

logger = logging.getLogger(__name__)

LOG_FIELDS = ["timestamp", "to_email", "company_name", "template", "subject", "status", "error"]


class EmailSender:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        self._sent = self._load_sent_log()
        if dry_run:
            logger.info("DRY RUN mode — no emails will actually be sent.")

    # ── Public API ─────────────────────────────────────────────────────────────

    def send_campaign(
        self,
        leads: list[dict],
        template_name: str = None,
        batch_size: int = None,
        filter_country: str = None,
        filter_type: str = None,
    ) -> dict:
        """
        Send emails to a list of leads.

        Args:
            leads:          List of lead dicts (from LeadCollector.load_leads).
            template_name:  Force a specific template. If None, auto-selected per lead.
            batch_size:     Override EMAIL_BATCH_SIZE.
            filter_country: Only send to this country (e.g. "China").
            filter_type:    Only send to this company type (e.g. "freight forwarder").

        Returns:
            {"sent": int, "skipped": int, "failed": int}
        """
        batch_size = batch_size or EMAIL_BATCH_SIZE
        stats = {"sent": 0, "skipped": 0, "failed": 0}

        # Filter
        targets = [l for l in leads if l.get("email")]
        if filter_country:
            targets = [l for l in targets if l.get("country", "").lower() == filter_country.lower()]
        if filter_type:
            targets = [l for l in targets if filter_type.lower() in l.get("company_type", "").lower()]

        targets = targets[:batch_size]
        logger.info("Sending to %d leads (batch_size=%d)", len(targets), batch_size)

        smtp = None if self.dry_run else self._connect()

        try:
            for i, lead in enumerate(targets, 1):
                email = lead["email"].strip().lower()

                if email in self._sent:
                    logger.info("[%d] SKIP (already sent): %s", i, email)
                    stats["skipped"] += 1
                    continue

                tmpl = template_name or choose_template(lead)
                subject = build_subject(tmpl, lead.get("company_name", ""))
                html_body, text_body = render_template(tmpl, self._build_context(lead))

                if not html_body and not text_body:
                    logger.warning("[%d] No template content for %s", i, tmpl)
                    stats["failed"] += 1
                    continue

                success, error = self._send_one(
                    smtp, email, subject, html_body, text_body, lead.get("company_name", "")
                )

                status = "sent" if success else "failed"
                self._log_send(email, lead.get("company_name", ""), tmpl, subject, status, error)

                if success:
                    self._sent.add(email)
                    stats["sent"] += 1
                    logger.info("[%d/%d] SENT → %s (%s)", i, len(targets), email, lead.get("company_name"))
                else:
                    stats["failed"] += 1
                    logger.warning("[%d/%d] FAILED → %s: %s", i, len(targets), email, error)

                # Polite delay between sends
                if i < len(targets):
                    delay = random.uniform(EMAIL_DELAY_MIN, EMAIL_DELAY_MAX)
                    logger.debug("Waiting %.0fs before next send...", delay)
                    time.sleep(delay)

        finally:
            if smtp:
                try:
                    smtp.quit()
                except Exception:
                    pass

        logger.info("Campaign done — sent=%d skipped=%d failed=%d", **stats)
        return stats

    def send_single(self, to_email: str, company_name: str, template_name: str = "short_intro") -> bool:
        """Send one email. Useful for testing."""
        lead = {"email": to_email, "company_name": company_name, "country": "USA", "company_type": "logistics"}
        result = self.send_campaign([lead], template_name=template_name, batch_size=1)
        return result["sent"] > 0

    # ── SMTP helpers ──────────────────────────────────────────────────────────

    def _connect(self) -> smtplib.SMTP:
        if not EMAIL_USER or not EMAIL_PASS:
            raise ValueError("EMAIL_USER and EMAIL_PASS must be set in .env")
        logger.info("Connecting to %s:%d ...", SMTP_HOST, SMTP_PORT)
        smtp = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
        smtp.ehlo()
        smtp.starttls()
        smtp.login(EMAIL_USER, EMAIL_PASS)
        logger.info("SMTP connected.")
        return smtp

    def _send_one(
        self, smtp, to_email: str, subject: str,
        html_body: str, text_body: str, company_name: str
    ) -> tuple[bool, str]:
        if self.dry_run:
            logger.info("[DRY RUN] Would send to %s — %s", to_email, subject)
            return True, ""

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = f"{EMAIL_NAME} <{EMAIL_USER}>"
            msg["To"]      = to_email
            msg["Reply-To"] = EMAIL_USER

            if text_body:
                msg.attach(MIMEText(text_body, "plain", "utf-8"))
            if html_body:
                msg.attach(MIMEText(html_body, "html", "utf-8"))

            smtp.sendmail(EMAIL_USER, to_email, msg.as_string())
            return True, ""
        except smtplib.SMTPRecipientsRefused:
            return False, "recipient refused"
        except smtplib.SMTPDataError as e:
            return False, f"data error: {e.smtp_error}"
        except Exception as exc:
            return False, str(exc)

    # ── Context builder ───────────────────────────────────────────────────────

    def _build_context(self, lead: dict) -> dict:
        name = lead.get("company_name", "").strip()
        return {
            "company_name": name or "there",
            "first_name":   name.split()[0] if name else "",
            "country":      lead.get("country", ""),
            "company_type": lead.get("company_type", "logistics company"),
            "website":      lead.get("website", ""),
        }

    # ── Log helpers ───────────────────────────────────────────────────────────

    def _load_sent_log(self) -> set[str]:
        sent = set()
        if EMAIL_LOG.exists():
            with open(EMAIL_LOG, newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    if row.get("status") == "sent":
                        sent.add(row["to_email"].strip().lower())
        logger.info("Loaded %d already-sent emails from log.", len(sent))
        return sent

    def _log_send(
        self, to_email: str, company_name: str, template: str,
        subject: str, status: str, error: str
    ) -> None:
        write_header = not EMAIL_LOG.exists()
        with open(EMAIL_LOG, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=LOG_FIELDS)
            if write_header:
                writer.writeheader()
            writer.writerow({
                "timestamp":    datetime.utcnow().isoformat(),
                "to_email":     to_email,
                "company_name": company_name,
                "template":     template,
                "subject":      subject,
                "status":       status,
                "error":        error,
            })
