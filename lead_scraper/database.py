import sqlite3
import os
from typing import List, Optional
from models import Lead
from config import DB_PATH


def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name    TEXT,
            contact_name    TEXT,
            phone           TEXT,
            whatsapp        TEXT,
            email           TEXT,
            website         TEXT,
            social_url      TEXT,
            source_url      TEXT UNIQUE,
            country         TEXT,
            city            TEXT,
            lead_type       TEXT,
            route_interest  TEXT,
            product_interest TEXT,
            score           INTEGER DEFAULT 0,
            status          TEXT DEFAULT 'NEW',
            classification  TEXT DEFAULT 'COLD',
            notes           TEXT,
            ai_analysis     TEXT,
            outreach_message TEXT,
            created_at      TEXT,
            updated_at      TEXT
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_classification ON leads(classification)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON leads(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_route ON leads(route_interest)")
    conn.commit()
    conn.close()


def save_lead(lead: Lead) -> Optional[int]:
    conn = get_connection()
    try:
        cursor = conn.execute("""
            INSERT OR IGNORE INTO leads (
                company_name, contact_name, phone, whatsapp, email,
                website, social_url, source_url, country, city,
                lead_type, route_interest, product_interest, score,
                status, classification, notes, ai_analysis,
                outreach_message, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            lead.company_name, lead.contact_name, lead.phone, lead.whatsapp,
            lead.email, lead.website, lead.social_url, lead.source_url,
            lead.country, lead.city, lead.lead_type, lead.route_interest,
            lead.product_interest, lead.score, lead.status, lead.classification,
            lead.notes, lead.ai_analysis, lead.outreach_message,
            lead.created_at, lead.updated_at,
        ))
        conn.commit()
        return cursor.lastrowid if cursor.rowcount > 0 else None
    except Exception as e:
        print(f"[DB] Error guardando lead: {e}")
        return None
    finally:
        conn.close()


def update_lead(lead_id: int, **kwargs):
    from datetime import datetime
    kwargs["updated_at"] = datetime.now().isoformat()
    conn = get_connection()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [lead_id]
    conn.execute(f"UPDATE leads SET {sets} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_all_leads(classification: str = None, status: str = None) -> List[dict]:
    conn = get_connection()
    query = "SELECT * FROM leads WHERE 1=1"
    params = []
    if classification:
        query += " AND classification = ?"
        params.append(classification)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY score DESC, created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_lead_by_id(lead_id: int) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_stats() -> dict:
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
    hot = conn.execute("SELECT COUNT(*) FROM leads WHERE classification='HOT'").fetchone()[0]
    warm = conn.execute("SELECT COUNT(*) FROM leads WHERE classification='WARM'").fetchone()[0]
    cold = conn.execute("SELECT COUNT(*) FROM leads WHERE classification='COLD'").fetchone()[0]
    partner = conn.execute("SELECT COUNT(*) FROM leads WHERE classification='PARTNER'").fetchone()[0]
    competitor = conn.execute("SELECT COUNT(*) FROM leads WHERE classification='COMPETITOR'").fetchone()[0]
    haiti = conn.execute("SELECT COUNT(*) FROM leads WHERE route_interest LIKE '%Haiti%'").fetchone()[0]
    dr = conn.execute("SELECT COUNT(*) FROM leads WHERE route_interest LIKE '%Dominican%'").fetchone()[0]
    with_email = conn.execute("SELECT COUNT(*) FROM leads WHERE email != ''").fetchone()[0]
    with_whatsapp = conn.execute("SELECT COUNT(*) FROM leads WHERE whatsapp != ''").fetchone()[0]
    conn.close()
    return {
        "total": total, "hot": hot, "warm": warm, "cold": cold,
        "partner": partner, "competitor": competitor,
        "haiti": haiti, "dr": dr,
        "with_email": with_email, "with_whatsapp": with_whatsapp,
    }


def url_exists(url: str) -> bool:
    conn = get_connection()
    row = conn.execute("SELECT id FROM leads WHERE source_url = ?", (url,)).fetchone()
    conn.close()
    return row is not None
