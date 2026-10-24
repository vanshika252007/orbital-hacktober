"""Anomalies endpoint - Teammate 2 (Backend/Platform)."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.schemas import AnomalySchema
from backend.app.services.database import get_db
from backend.app.services import anomaly_service

router = APIRouter()


@router.get(
    "/anomalies",
    response_model=List[AnomalySchema],
    summary="List recent raw anomaly events",
)
def list_anomalies(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns the most recent raw anomaly events from the ML engine.
    Anomalies are the raw detection output; Alerts are the user-facing lifecycle objects.
    """
    return anomaly_service.get_recent_anomalies(db, limit=limit)
