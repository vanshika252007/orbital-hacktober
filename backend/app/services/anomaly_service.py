"""
Anomaly service - Teammate 2 (Backend/Platform).

Handles anomaly persistence and retrieval.
Anomalies are the raw ML engine output; alerts are the user-facing lifecycle objects.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.app.models import Anomaly
from backend.app.schemas import AnomalySchema, Severity, SignalSchema


def _orm_to_schema(a: Anomaly) -> AnomalySchema:
    signals = [SignalSchema(**sig) for sig in a.signals]
    return AnomalySchema(
        id=a.id,
        device_id=a.device_id,
        anomaly=a.anomaly,
        risk_score=a.risk_score,
        severity=Severity(a.severity),
        detected_at=a.detected_at,
        signals=signals,
    )


def create_anomaly(
    db: Session,
    device_id: str,
    risk_score: float,
    severity: str,
    signals: list,
    detected_at: Optional[datetime] = None,
    anomaly_id: Optional[str] = None,
) -> Anomaly:
    record = Anomaly(
        id=anomaly_id or f"anomaly_{uuid.uuid4().hex[:8]}",
        device_id=device_id,
        anomaly=True,
        risk_score=risk_score,
        severity=severity.upper(),
        detected_at=detected_at or datetime.now(timezone.utc),
    )
    record.signals = signals
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_recent_anomalies(db: Session, limit: int = 50) -> List[AnomalySchema]:
    anomalies = (
        db.query(Anomaly)
        .order_by(Anomaly.detected_at.desc())
        .limit(limit)
        .all()
    )
    return [_orm_to_schema(a) for a in anomalies]


def delete_all_anomalies(db: Session) -> None:
    db.query(Anomaly).delete()
    db.commit()
