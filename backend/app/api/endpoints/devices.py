"""Devices endpoints - Teammate 2 (Backend/Platform)."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.schemas import DeviceListItem, DeviceSchema, TimelineEntry, NetworkStats
from backend.app.services.database import get_db
from backend.app.services import device_service, alert_service

router = APIRouter()


@router.get(
    "/stats",
    response_model=NetworkStats,
    summary="Network-wide statistics",
)
def get_stats(db: Session = Depends(get_db)):
    """Returns overall network health statistics for the dashboard KPI cards."""
    from backend.app.models import Device, TimelineEvent
    total_devices = db.query(Device).count()
    active_anomalies = alert_service.count_active_alerts(db)
    critical_count = alert_service.count_critical_alerts(db)
    total_events = db.query(TimelineEvent).count()

    if critical_count > 0:
        health = "CRITICAL"
    elif active_anomalies > 0:
        health = "DEGRADED"
    else:
        health = "HEALTHY"

    return NetworkStats(
        total_devices=total_devices,
        active_anomalies=active_anomalies,
        critical_count=critical_count,
        total_events=total_events,
        network_health=health,
    )


@router.get(
    "/devices",
    response_model=List[DeviceListItem],
    summary="List all devices",
)
def list_devices(db: Session = Depends(get_db)):
    """Returns all 42 devices with current status and risk scores, sorted by risk score descending."""
    return device_service.get_all_devices(db)


@router.get(
    "/devices/{device_id}",
    response_model=DeviceSchema,
    summary="Get device detail",
)
def get_device(device_id: str, db: Session = Depends(get_db)):
    """
    Returns detailed device info including baseline vs current metrics comparison.
    The `current_metrics` field is populated only when a simulation is active.
    """
    device = device_service.get_device(db, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")
    return device


@router.get(
    "/devices/{device_id}/timeline",
    response_model=List[TimelineEntry],
    summary="Device historical timeline",
)
def get_device_timeline(
    device_id: str,
    limit: int = 168,
    db: Session = Depends(get_db),
):
    """
    Returns the historical timeline of metrics for a device.
    `limit` defaults to 168 (7 days × 24 hours). Results are in chronological order.
    """
    device = device_service.get_device(db, device_id)
    if device is None:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")
    return device_service.get_device_timeline(db, device_id, limit=limit)
