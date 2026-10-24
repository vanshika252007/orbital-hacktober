"""
Alert service - Teammate 2 (Backend/Platform).

Handles alert creation, retrieval, status updates, and mapping to Pydantic schemas.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.app.models import Alert
from backend.app.schemas import (
    AlertListItem,
    AlertSchema,
    AlertStatus,
    Severity,
    SignalSchema,
)


def _severity_enum(s: str) -> Severity:
    try:
        return Severity(s.upper())
    except ValueError:
        return Severity.LOW


def _orm_to_alert(a: Alert) -> AlertSchema:
    signals = [SignalSchema(**sig) for sig in a.signals]
    return AlertSchema(
        id=a.id,
        device_id=a.device_id,
        device_name=a.device_name,
        risk_score=a.risk_score,
        severity=_severity_enum(a.severity),
        status=AlertStatus(a.status),
        detected_at=a.detected_at,
        primary_reason=a.primary_reason,
        signals_count=a.signals_count,
        signals=signals,
    )


def _orm_to_list_item(a: Alert) -> AlertListItem:
    return AlertListItem(
        id=a.id,
        device_id=a.device_id,
        device_name=a.device_name,
        risk_score=a.risk_score,
        severity=_severity_enum(a.severity),
        status=AlertStatus(a.status),
        detected_at=a.detected_at,
        primary_reason=a.primary_reason,
        signals_count=a.signals_count,
    )


def create_alert(
    db: Session,
    device_id: str,
    device_name: str,
    risk_score: float,
    severity: str,
    primary_reason: str,
    signals: list,
    detected_at: Optional[datetime] = None,
    alert_id: Optional[str] = None,
) -> Alert:
    """Create and persist a new alert."""
    alert = Alert(
        id=alert_id or f"alert_{uuid.uuid4().hex[:8]}",
        device_id=device_id,
        device_name=device_name,
        risk_score=risk_score,
        severity=severity.upper(),
        status=AlertStatus.OPEN.value,
        detected_at=detected_at or datetime.now(timezone.utc),
        primary_reason=primary_reason,
        signals_count=len(signals),
    )
    alert.signals = signals
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def get_all_alerts(db: Session) -> List[AlertListItem]:
    alerts = (
        db.query(Alert)
        .order_by(Alert.risk_score.desc(), Alert.detected_at.desc())
        .all()
    )
    return [_orm_to_list_item(a) for a in alerts]


def get_alert(db: Session, alert_id: str) -> Optional[AlertSchema]:
    a = db.get(Alert, alert_id)
    if a is None:
        return None
    return _orm_to_alert(a)


def delete_alert(db: Session, alert_id: str) -> None:
    a = db.get(Alert, alert_id)
    if a:
        db.delete(a)
        db.commit()


def delete_all_alerts(db: Session) -> None:
    db.query(Alert).delete()
    db.commit()


def update_alert_status(db: Session, alert_id: str, status: AlertStatus) -> Optional[AlertSchema]:
    a = db.get(Alert, alert_id)
    if a is None:
        return None
    a.status = status.value
    db.commit()
    db.refresh(a)
    return _orm_to_alert(a)


def count_active_alerts(db: Session) -> int:
    return db.query(Alert).filter(Alert.status == AlertStatus.OPEN.value).count()


def count_critical_alerts(db: Session) -> int:
    return (
        db.query(Alert)
        .filter(Alert.status == AlertStatus.OPEN.value, Alert.severity == Severity.CRITICAL.value)
        .count()
    )
