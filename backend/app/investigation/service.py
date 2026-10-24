from typing import Any, Dict, Optional

from backend.app.ai.fallback_engine import generate_fallback_investigation


def investigate_anomaly(
    anomaly: Dict[str, Any],
    device: Optional[Dict[str, Any]] = None,
    alert: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generate a structured investigation for an already-detected anomaly.

    This function does not detect anomalies. It explains the signals it receives.
    """
    if not isinstance(anomaly, dict):
        raise TypeError("anomaly must be a dictionary")

    return generate_fallback_investigation(
        anomaly=anomaly,
        device=device,
        alert=alert,
    )
