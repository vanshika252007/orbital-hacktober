"""Investigations endpoints - Teammate 2 (Backend/Platform)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.schemas import InvestigationSchema
from backend.app.services.database import get_db
from backend.app.services import alert_service, investigation_service

router = APIRouter()


@router.get(
    "/investigations/{alert_id}",
    response_model=InvestigationSchema,
    summary="Get cached investigation",
)
def get_investigation(alert_id: str, db: Session = Depends(get_db)):
    """
    Returns the cached investigation for a given alert.
    Investigations are pre-generated on simulation start or explicitly via the POST endpoint.
    Returns 404 if not yet generated.
    """
    alert = alert_service.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

    investigation = investigation_service.get_investigation(db, alert_id)
    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail=f"No investigation found for alert '{alert_id}'. Call POST /api/investigations/{alert_id}/generate",
        )
    return investigation


@router.post(
    "/investigations/{alert_id}/generate",
    response_model=InvestigationSchema,
    summary="Generate (or regenerate) investigation",
)
def generate_investigation(alert_id: str, db: Session = Depends(get_db)):
    """
    Triggers on-demand investigation generation for the given alert.
    Calls Teammate 4's AI/Fallback engine. Works 100% without an LLM API key
    via the deterministic fallback engine. Re-generation replaces any cached result.
    """
    alert = alert_service.get_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

    # Try Teammate 4's investigation engine
    try:
        from backend.app.ai.fallback_engine import generate_fallback_investigation  # type: ignore
        anomaly_payload = {
            "device_id": alert.device_id,
            "alert_id": alert_id,
            "signals": [sig.model_dump() for sig in alert.signals],
        }
        device_payload = {"id": alert.device_id, "name": alert.device_name}
        alert_payload = {"id": alert_id, "device_id": alert.device_id}
        result = generate_fallback_investigation(anomaly_payload, device_payload, alert_payload)
    except ImportError:
        # Teammate 4's module not available - produce a minimal fallback
        result = _minimal_fallback(alert)

    return investigation_service.save_investigation(db, alert_id, alert.device_id, result)


def _minimal_fallback(alert) -> dict:
    """Minimal built-in fallback when Teammate 4's module is not installed."""
    return {
        "alert_id": alert.id,
        "device_id": alert.device_id,
        "summary": (
            f"Device {alert.device_name} has triggered a {alert.severity} severity alert "
            f"with a risk score of {alert.risk_score}/100. "
            "Investigation guidance is provided below based on detected anomaly signals."
        ),
        "observed_evidence": [
            sig.explanation for sig in alert.signals
        ] or ["No detailed signals available. Review raw network telemetry."],
        "possible_explanations": [
            "Potential unauthorized data transfer or exfiltration",
            "Host may be compromised and performing automated scanning",
            "Misconfigured application generating unexpected traffic",
        ],
        "check_first": [
            {"priority": 1, "action": "Review DNS requests", "reason": "Check for unusual domain lookups or DGA patterns."},
            {"priority": 2, "action": "Inspect outbound connections", "reason": "Identify unexpected remote hosts and destination ports."},
            {"priority": 3, "action": "Check running processes", "reason": "Find processes responsible for anomalous network activity."},
            {"priority": 4, "action": "Verify device ownership", "reason": "Confirm expected user and physical access at the time of the event."},
            {"priority": 5, "action": "Consider network isolation", "reason": "Contain risk if activity continues during investigation."},
        ],
        "next_steps": [
            "Escalate to security team if activity matches known indicators of compromise",
            "Preserve forensic evidence before remediation",
        ],
        "confidence": "medium",
        "generated_by": "deterministic_fallback",
    }
