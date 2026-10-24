"""Alerts endpoints - Teammate 2 (Backend/Platform)."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.schemas import AlertListItem, AlertSchema
from backend.app.services.database import get_db
from backend.app.services import alert_service

router = APIRouter()


@router.get(
    "/alerts",
    response_model=List[AlertListItem],
    summary="List all alerts",
)
def list_alerts(db: Session = Depends(get_db)):
    """Returns all alerts sorted by risk score (highest first), then by detection time."""
    return alert_service.get_all_alerts(db)


@router.get(
    "/alerts/{alert_id}",
    response_model=AlertSchema,
    summary="Get alert details",
)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """Returns full alert details including all anomaly signals."""
    alert = alert_service.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
    return alert
