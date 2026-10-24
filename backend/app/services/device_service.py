"""
Device service - Teammate 2 (Backend/Platform).

Handles device CRUD, seeding from ML data generator profiles,
and translating ORM objects to Pydantic schemas.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.app.models import Device, TimelineEvent
from backend.app.schemas import (
    CurrentMetrics,
    DeviceBaseline,
    DeviceListItem,
    DeviceSchema,
    DeviceStatus,
    TimelineEntry,
)


def _device_status(risk_score: float) -> DeviceStatus:
    if risk_score <= 30:
        return DeviceStatus.HEALTHY
    if risk_score <= 60:
        return DeviceStatus.WARNING
    return DeviceStatus.CRITICAL


def _orm_to_detail(d: Device) -> DeviceSchema:
    baseline = DeviceBaseline(
        avg_bytes_sent=d.avg_bytes_sent,
        avg_bytes_received=d.avg_bytes_received,
        avg_connections=d.avg_connections,
        avg_unique_destinations=d.avg_unique_destinations,
        avg_failed_connections=d.avg_failed_connections,
        avg_dns_requests=d.avg_dns_requests,
        active_hours_start=d.active_hours_start,
        active_hours_end=d.active_hours_end,
    )
    current: Optional[CurrentMetrics] = None
    if d.cur_bytes_sent is not None:
        current = CurrentMetrics(
            bytes_sent=d.cur_bytes_sent,
            bytes_received=d.cur_bytes_received or 0,
            connections=d.cur_connections or 0,
            unique_destinations=d.cur_unique_destinations or 0,
            failed_connections=d.cur_failed_connections or 0,
            dns_requests=d.cur_dns_requests or 0,
            activity_hour=d.cur_activity_hour or 0,
        )
    return DeviceSchema(
        id=d.id,
        name=d.name,
        type=d.type,
        ip=d.ip,
        mac=d.mac,
        status=d.status,
        risk_score=d.risk_score,
        last_seen=d.last_seen,
        baseline=baseline,
        current_metrics=current,
    )


def _orm_to_list_item(d: Device) -> DeviceListItem:
    return DeviceListItem(
        id=d.id,
        name=d.name,
        type=d.type,
        ip=d.ip,
        mac=d.mac,
        status=d.status,
        risk_score=d.risk_score,
        last_seen=d.last_seen,
    )


def seed_devices(db: Session, profiles: list) -> None:
    """
    Seed the Device table from ML data generator profiles.
    Profiles is a list of dicts from data_generator.build_profiles().to_dict().
    Idempotent: updates existing rows, inserts new ones.
    """
    for p in profiles:
        ip = p["id"] if isinstance(p, dict) else p.id
        existing = db.get(Device, ip)
        if existing is None:
            device = Device(
                id=p["id"] if isinstance(p, dict) else p.id,
                name=p["name"] if isinstance(p, dict) else p.name,
                type=p["type"] if isinstance(p, dict) else p.type,
                ip=p["ip"] if isinstance(p, dict) else p.ip,
                mac=p["mac"] if isinstance(p, dict) else p.mac,
                status=DeviceStatus.HEALTHY.value,
                risk_score=0.0,
                avg_bytes_sent=float(p["avg_bytes_sent"] if isinstance(p, dict) else p.avg_bytes_sent),
                avg_bytes_received=float(p["avg_bytes_received"] if isinstance(p, dict) else p.avg_bytes_received),
                avg_connections=float(p["avg_connections"] if isinstance(p, dict) else p.avg_connections),
                avg_unique_destinations=float(p["avg_unique_destinations"] if isinstance(p, dict) else p.avg_unique_destinations),
                avg_failed_connections=float(p["avg_failed_connections"] if isinstance(p, dict) else p.avg_failed_connections),
                avg_dns_requests=float(p["avg_dns_requests"] if isinstance(p, dict) else p.avg_dns_requests),
                active_hours_start=int(p["active_hours_start"] if isinstance(p, dict) else p.active_hours_start),
                active_hours_end=int(p["active_hours_end"] if isinstance(p, dict) else p.active_hours_end),
            )
            db.add(device)
    db.commit()


def get_all_devices(db: Session) -> List[DeviceListItem]:
    devices = db.query(Device).order_by(Device.risk_score.desc()).all()
    return [_orm_to_list_item(d) for d in devices]


def get_device(db: Session, device_id: str) -> Optional[DeviceSchema]:
    d = db.get(Device, device_id)
    if d is None:
        return None
    return _orm_to_detail(d)


def get_device_timeline(db: Session, device_id: str, limit: int = 168) -> List[TimelineEntry]:
    """Return the most recent `limit` timeline events for a device (newest first)."""
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.device_id == device_id)
        .order_by(TimelineEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        TimelineEntry(
            timestamp=e.timestamp,
            bytes_sent=e.bytes_sent,
            bytes_received=e.bytes_received,
            connections=e.connections,
            unique_destinations=e.unique_destinations,
            failed_connections=e.failed_connections,
            dns_requests=e.dns_requests,
            risk_score=e.risk_score,
            is_anomaly=e.is_anomaly,
            activity_hour=e.activity_hour,
        )
        for e in reversed(events)  # return chronological order
    ]


def update_device_live_metrics(
    db: Session,
    device_id: str,
    metrics: dict,
    risk_score: float,
    status: str,
) -> None:
    """Apply anomaly/simulation current metrics to a device row."""
    d = db.get(Device, device_id)
    if d is None:
        return
    d.risk_score = risk_score
    d.status = status
    d.last_seen = datetime.now(timezone.utc)
    d.cur_bytes_sent = metrics.get("bytes_sent")
    d.cur_bytes_received = metrics.get("bytes_received")
    d.cur_connections = metrics.get("connections") or metrics.get("connection_count")
    d.cur_unique_destinations = metrics.get("unique_destinations")
    d.cur_failed_connections = metrics.get("failed_connections")
    d.cur_dns_requests = metrics.get("dns_requests")
    d.cur_activity_hour = metrics.get("activity_hour")
    db.commit()


def reset_device_live_metrics(db: Session, device_id: str) -> None:
    """Clear all live/current metrics for a device, returning it to baseline state."""
    d = db.get(Device, device_id)
    if d is None:
        return
    d.risk_score = 0.0
    d.status = DeviceStatus.HEALTHY.value
    d.last_seen = None
    d.cur_bytes_sent = None
    d.cur_bytes_received = None
    d.cur_connections = None
    d.cur_unique_destinations = None
    d.cur_failed_connections = None
    d.cur_dns_requests = None
    d.cur_activity_hour = None
    db.commit()
