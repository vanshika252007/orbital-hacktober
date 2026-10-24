"""
Simulation State Manager - Teammate 2 (Backend/Platform).

Manages the deterministic hero anomaly demo workflow described in Section 6
of the master prompt. On simulation start:
  1. Generates the hero anomaly window (Student-Laptop, 192.168.1.23)
  2. Evaluates it through the ML rule engine (Teammate 1's interfaces)
  3. Computes a risk score
  4. Persists Alert, Anomaly, and Timeline records
  5. Updates the device's live metrics and status

On reset:
  - Removes all alerts, anomalies, investigations for the hero device
  - Clears live metrics, returning the device to healthy baseline

This module calls Teammate 1's ML interfaces (rules, risk_engine) and
Teammate 4's fallback investigation engine.  Both are consumed as imports;
if their packages are not yet installed, a graceful fallback is used.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Import Teammate 1's ML interfaces (graceful degradation if not installed)
# ---------------------------------------------------------------------------
try:
    from backend.app.simulation.data_generator import (  # type: ignore
        HERO_DEVICE_ID,
        HERO_TIMESTAMP,
        build_hero_anomaly_record,
        build_profiles,
    )
    _HAS_GENERATOR = True
except ImportError:
    _HAS_GENERATOR = False
    HERO_DEVICE_ID = "192.168.1.23"
    HERO_TIMESTAMP = "2026-10-24T03:17:00Z"

try:
    from backend.app.ml.baseline import DeviceBaseline  # type: ignore
    from backend.app.ml.risk_engine import (  # type: ignore
        DEFAULT_RISK_CONFIG,
        RiskConfig,
        compute_risk_score,
        severity_from_score,
        severity_to_status,
    )
    from backend.app.ml.rules import evaluate as evaluate_rules  # type: ignore
    _HAS_ML = True
except ImportError:
    _HAS_ML = False

# ---------------------------------------------------------------------------
# Import Teammate 4's investigation engine (graceful degradation)
# ---------------------------------------------------------------------------
try:
    from backend.app.ai.fallback_engine import generate_fallback_investigation  # type: ignore
    _HAS_INVESTIGATION = True
except ImportError:
    _HAS_INVESTIGATION = False

from backend.app.services import (
    alert_service,
    anomaly_service,
    device_service,
    investigation_service,
)
from backend.app.models import TimelineEvent


# ---------------------------------------------------------------------------
# Pre-computed hero anomaly specification (mirrors shared/contracts/)
# ---------------------------------------------------------------------------

HERO_SIGNALS = [
    {
        "type": "traffic_spike",
        "severity": "HIGH",
        "measured_value": 2202010,
        "baseline_value": 25600,
        "deviation_factor": 86.0,
        "explanation": "Outbound traffic is 86.0x above baseline (2.1 MB vs 25 KB normal)",
    },
    {
        "type": "failed_connection_burst",
        "severity": "CRITICAL",
        "measured_value": 340,
        "baseline_value": 2,
        "deviation_factor": 170.0,
        "explanation": "340 failed connection attempts vs 2 normal (170.0x baseline); could indicate scanning or unreachable remote hosts",
    },
    {
        "type": "destination_explosion",
        "severity": "HIGH",
        "measured_value": 47,
        "baseline_value": 5,
        "deviation_factor": 9.4,
        "explanation": "Contacted 47 unique destinations vs 5 normal (9.4x baseline)",
    },
    {
        "type": "unusual_hours",
        "severity": "HIGH",
        "measured_value": 3,
        "baseline_value": 8,
        "deviation_factor": 5,
        "explanation": "Activity at 03:17 is outside this device's normal active hours (08:00-22:00)",
    },
]

HERO_RISK_SCORE = 94.0
HERO_SEVERITY = "CRITICAL"
HERO_PRIMARY_REASON = (
    "Extreme outbound traffic spike (86.0x), 340 failed connections (170x), "
    "47 unique destinations (9.4x), and activity at 03:17 AM outside normal hours"
)
HERO_CURRENT_METRICS = {
    "bytes_sent": 2202010,
    "bytes_received": 512000,
    "connections": 430,
    "connection_count": 430,
    "unique_destinations": 47,
    "failed_connections": 340,
    "dns_requests": 180,
    "activity_hour": 3,
}


# ---------------------------------------------------------------------------
# In-memory simulation state
# ---------------------------------------------------------------------------

@dataclass
class SimulationState:
    active: bool = False
    alert_id: Optional[str] = None
    anomaly_id: Optional[str] = None
    hero_device_id: str = HERO_DEVICE_ID
    started_at: Optional[datetime] = None
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)


# Module-level singleton
_state = SimulationState()


def is_active() -> bool:
    return _state.active


def get_state() -> SimulationState:
    return _state


# ---------------------------------------------------------------------------
# Simulation start
# ---------------------------------------------------------------------------

def start_simulation(
    db: Session,
    alert_id: str = "alert_hero_001",
    anomaly_id: str = "anomaly_hero_001",
) -> dict:
    """
    Trigger the hero anomaly demo scenario.
    Returns a dict with status, alert_id, device_id.
    """
    with _state._lock:
        if _state.active:
            return {
                "status": "already_active",
                "message": "Simulation is already running. Call /api/simulation/reset first.",
                "alert_id": _state.alert_id,
                "device_id": _state.hero_device_id,
            }

        detected_at = datetime.fromisoformat(HERO_TIMESTAMP.replace("Z", "+00:00"))
        device_name = "Student-Laptop"
        device_id = HERO_DEVICE_ID

        # -----------------------------------------------------------------
        # 1. Try to call Teammate 1's ML engine for live rule evaluation
        # -----------------------------------------------------------------
        signals = _compute_signals_or_fallback()

        # -----------------------------------------------------------------
        # 2. Persist anomaly record
        # -----------------------------------------------------------------
        # Remove old hero anomaly if exists (idempotent start)
        _cleanup_hero_records(db, alert_id, anomaly_id)

        anomaly_obj = anomaly_service.create_anomaly(
            db=db,
            device_id=device_id,
            risk_score=HERO_RISK_SCORE,
            severity=HERO_SEVERITY,
            signals=signals,
            detected_at=detected_at,
            anomaly_id=anomaly_id,
        )

        # -----------------------------------------------------------------
        # 3. Persist alert record
        # -----------------------------------------------------------------
        alert_obj = alert_service.create_alert(
            db=db,
            device_id=device_id,
            device_name=device_name,
            risk_score=HERO_RISK_SCORE,
            severity=HERO_SEVERITY,
            primary_reason=HERO_PRIMARY_REASON,
            signals=signals,
            detected_at=detected_at,
            alert_id=alert_id,
        )

        # -----------------------------------------------------------------
        # 4. Update device live metrics
        # -----------------------------------------------------------------
        device_service.update_device_live_metrics(
            db=db,
            device_id=device_id,
            metrics=HERO_CURRENT_METRICS,
            risk_score=HERO_RISK_SCORE,
            status="critical",
        )

        # -----------------------------------------------------------------
        # 5. Append a timeline event for the hero anomaly
        # -----------------------------------------------------------------
        _append_hero_timeline_event(db, device_id, detected_at)

        # -----------------------------------------------------------------
        # 6. Pre-generate and cache investigation (Teammate 4 interface)
        # -----------------------------------------------------------------
        _generate_and_cache_investigation(db, alert_id, device_id, device_name, signals)

        # -----------------------------------------------------------------
        # 7. Update in-memory state
        # -----------------------------------------------------------------
        _state.active = True
        _state.alert_id = alert_id
        _state.anomaly_id = anomaly_id
        _state.started_at = datetime.now(timezone.utc)

        return {
            "status": "started",
            "message": f"Hero anomaly simulation activated for {device_name} ({device_id})",
            "alert_id": alert_id,
            "device_id": device_id,
        }


# ---------------------------------------------------------------------------
# Simulation reset
# ---------------------------------------------------------------------------

def reset_simulation(db: Session) -> dict:
    """Reset all anomaly state: clear alerts, anomalies, investigations, live metrics."""
    with _state._lock:
        alert_id = _state.alert_id
        anomaly_id = _state.anomaly_id
        device_id = _state.hero_device_id

        _cleanup_hero_records(db, alert_id, anomaly_id)

        # Clear live device metrics -> returns device to HEALTHY
        device_service.reset_device_live_metrics(db, device_id)

        # Remove all hero timeline anomaly events
        db.query(TimelineEvent).filter(
            TimelineEvent.device_id == device_id,
            TimelineEvent.is_anomaly == True,
        ).delete()
        db.commit()

        _state.active = False
        _state.alert_id = None
        _state.anomaly_id = None
        _state.started_at = None

        return {
            "status": "reset",
            "message": "Simulation has been reset. All devices returned to clean baseline.",
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_signals_or_fallback() -> list:
    """Try Teammate 1's rule engine; fall back to the pre-computed hero signals."""
    if _HAS_ML and _HAS_GENERATOR:
        try:
            hero_window = build_hero_anomaly_record()
            profiles = build_profiles()
            hero_profile = next(p for p in profiles if p.ip == HERO_DEVICE_ID)
            baseline = DeviceBaseline.from_profile(hero_profile)  # type: ignore[attr-defined]
            return evaluate_rules(hero_window, baseline)
        except Exception:
            pass
    return list(HERO_SIGNALS)


def _cleanup_hero_records(db: Session, alert_id: Optional[str], anomaly_id: Optional[str]) -> None:
    """Remove hero alert, anomaly, and investigation if they exist."""
    if alert_id:
        investigation_service.delete_all_investigations(db)  # removes by FK cascade
        alert_service.delete_alert(db, alert_id)
    if anomaly_id:
        from backend.app.models import Anomaly
        a = db.get(Anomaly, anomaly_id)
        if a:
            db.delete(a)
            db.commit()


def _append_hero_timeline_event(db: Session, device_id: str, detected_at: datetime) -> None:
    event = TimelineEvent(
        device_id=device_id,
        timestamp=detected_at,
        bytes_sent=HERO_CURRENT_METRICS["bytes_sent"],
        bytes_received=HERO_CURRENT_METRICS["bytes_received"],
        connections=HERO_CURRENT_METRICS["connections"],
        unique_destinations=HERO_CURRENT_METRICS["unique_destinations"],
        failed_connections=HERO_CURRENT_METRICS["failed_connections"],
        dns_requests=HERO_CURRENT_METRICS["dns_requests"],
        risk_score=HERO_RISK_SCORE,
        is_anomaly=True,
        activity_hour=HERO_CURRENT_METRICS["activity_hour"],
    )
    db.add(event)
    db.commit()


def _generate_and_cache_investigation(
    db: Session,
    alert_id: str,
    device_id: str,
    device_name: str,
    signals: list,
) -> None:
    """Call Teammate 4's engine and cache the investigation."""
    if _HAS_INVESTIGATION:
        try:
            anomaly_payload = {
                "device_id": device_id,
                "signals": signals,
                "alert_id": alert_id,
            }
            device_payload = {"id": device_id, "name": device_name}
            alert_payload = {"id": alert_id, "device_id": device_id}
            result = generate_fallback_investigation(anomaly_payload, device_payload, alert_payload)
            investigation_service.save_investigation(db, alert_id, device_id, result)
            return
        except Exception:
            pass

    # Fallback: produce a static investigation from the hero signals
    _save_static_investigation(db, alert_id, device_id, signals)


def _save_static_investigation(
    db: Session,
    alert_id: str,
    device_id: str,
    signals: list,
) -> None:
    static = {
        "summary": (
            "Device Student-Laptop exhibits suspicious network behaviors starting at 03:17 AM. "
            "The behavioral anomaly includes extreme traffic spikes, mass connection failures, "
            "and contact with a large number of previously unseen destinations."
        ),
        "observed_evidence": [
            signal["explanation"]
            for signal in signals
            if isinstance(signal, dict) and signal.get("explanation")
        ] or [
            "No detailed anomaly signals were provided; inspect the underlying telemetry."
        ],
        "possible_explanations": [
            "Internal host performing automated network reconnaissance/scanning",
            "Data staging or exfiltration attempt via non-standard ports",
            "Malware trying to contact unavailable C2 nodes causing failed connections",
        ],
        "check_first": [
            {"priority": 1, "action": "Review DNS requests", "reason": "Identify if destination IPs correlate with newly registered domain queries or DGA patterns."},
            {"priority": 2, "action": "Inspect outbound connections", "reason": "Identify active network sockets and target destination ports."},
            {"priority": 3, "action": "Check running processes on host", "reason": "Pinpoint local executable responsible for background traffic at 03:17 AM."},
            {"priority": 4, "action": "Verify device ownership", "reason": "Confirm if Student-Laptop was physically active or remotely accessed at night."},
            {"priority": 5, "action": "Consider network isolation if traffic continues", "reason": "Prevent potential data staging or lateral movement while investigating."},
        ],
        "next_steps": [
            "Isolate host if outbound data volume increases further",
            "Check EDR / system logs for process creation events at 03:17 AM",
        ],
        "confidence": "medium",
        "generated_by": "deterministic_fallback",
    }
    investigation_service.save_investigation(db, alert_id, device_id, static)
