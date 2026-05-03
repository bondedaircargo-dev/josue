from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Lead:
    company_name: str = ""
    contact_name: str = ""
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    website: str = ""
    social_url: str = ""
    source_url: str = ""
    country: str = ""
    city: str = ""
    lead_type: str = ""        # logistics, importer, store, forwarder, etc.
    route_interest: str = ""   # Haiti, Dominican Republic, Both
    product_interest: str = "" # electronics, fashion, general, etc.
    score: int = 0             # 0-100
    status: str = "NEW"        # NEW, CONTACTED, QUALIFIED, DISCARDED
    classification: str = ""   # HOT, WARM, COLD, PARTNER, COMPETITOR
    notes: str = ""
    ai_analysis: str = ""
    outreach_message: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    id: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "company_name": self.company_name,
            "contact_name": self.contact_name,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "email": self.email,
            "website": self.website,
            "social_url": self.social_url,
            "source_url": self.source_url,
            "country": self.country,
            "city": self.city,
            "lead_type": self.lead_type,
            "route_interest": self.route_interest,
            "product_interest": self.product_interest,
            "score": self.score,
            "status": self.status,
            "classification": self.classification,
            "notes": self.notes,
            "ai_analysis": self.ai_analysis,
            "outreach_message": self.outreach_message,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
