"""
Investigation service - Teammate 2 (Backend/Platform).

Orchestrates investigation generation by calling Teammate 4's investigation module
(or its deterministic fallback). Handles caching via the SQLite Investigation table.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models import Investigation
from backend.app.schemas import CheckFirstItem, Confidence, InvestigationSchema


def _orm_to_schema(inv: Investigation) -> InvestigationSchema:
    return InvestigationSchema(
        alert_id=inv.alert_id,
        device_id=inv.device_id,
        summary=inv.summary,
        observed_evidence=inv.observed_evidence,
        possible_explanations=inv.possible_explanations,
        check_first=[CheckFirstItem(**cf) for cf in inv.check_first],
        next_steps=inv.next_steps,
        confidence=Confidence(inv.confidence),
        generated_by=inv.generated_by,
    )


def get_investigation(db: Session, alert_id: str) -> Optional[InvestigationSchema]:
    """Return cached investigation for alert_id, or None if not generated yet."""
    inv = db.query(Investigation).filter(Investigation.alert_id == alert_id).first()
    if inv is None:
        return None
    return _orm_to_schema(inv)


def save_investigation(
    db: Session,
    alert_id: str,
    device_id: str,
    result: dict,
) -> InvestigationSchema:
    """Persist an investigation result dict (from Teammate 4's generate_fallback_investigation)."""
    # Remove existing cached investigation for this alert
    db.query(Investigation).filter(Investigation.alert_id == alert_id).delete()

    inv = Investigation(
        id=f"inv_{uuid.uuid4().hex[:8]}",
        alert_id=alert_id,
        device_id=device_id,
        summary=result.get("summary", ""),
        confidence=result.get("confidence", "medium"),
        generated_by=result.get("generated_by", "deterministic_fallback"),
    )
    inv.observed_evidence = result.get("observed_evidence", [])
    inv.possible_explanations = result.get("possible_explanations", [])
    inv.check_first = result.get("check_first", [])
    inv.next_steps = result.get("next_steps", [])

    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _orm_to_schema(inv)


def delete_all_investigations(db: Session) -> None:
    db.query(Investigation).delete()
    db.commit()
