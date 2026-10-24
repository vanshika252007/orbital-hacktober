from typing import Any, Dict, List, Optional


SIGNAL_GUIDANCE = {
    "traffic_spike": (
        "Inspect outbound connections",
        "Identify unusual destination IPs, ports, and outbound traffic."
    ),
    "failed_connection_burst": (
        "Review failed connection logs",
        "Check repeated failures, unusual ports, and possible scanning behavior."
    ),
    "destination_explosion": (
        "Inspect contacted destinations",
        "Identify newly contacted or unexpected external destinations."
    ),
    "connection_burst": (
        "Inspect active connections",
        "Review unusual connection counts, destination ports, and remote hosts."
    ),
    "unusual_hours": (
        "Verify device activity",
        "Confirm whether activity at this time was expected."
    ),
    "new_external_destination": (
        "Investigate new external destinations",
        "Verify the destination and whether the connection was expected."
    ),
}


def generate_fallback_investigation(
    anomaly: Dict[str, Any],
    device: Optional[Dict[str, Any]] = None,
    alert: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate an investigation without an LLM or API key."""

    device = device or {}
    alert = alert or {}

    device_id = (
        anomaly.get("device_id")
        or alert.get("device_id")
        or device.get("id")
        or device.get("ip")
        or "unknown"
    )
    alert_id = alert.get("id") or anomaly.get("alert_id") or "unknown"
    device_name = device.get("name") or device_id

    signals = anomaly.get("signals") or alert.get("signals") or []

    evidence: List[str] = []
    explanations: List[str] = []
    actions: List[Dict[str, str]] = []
    seen_actions = set()

    explanation_map = {
        "traffic_spike": (
            "The device may be transferring more data than expected."
        ),
        "failed_connection_burst": (
            "Repeated failures may indicate scanning or unavailable services."
        ),
        "destination_explosion": (
            "The device may be contacting an unusually broad set of destinations."
        ),
        "connection_burst": (
            "The device may be initiating an unusual number of connections."
        ),
        "unusual_hours": (
            "The activity may be outside the device's normal operating schedule."
        ),
        "new_external_destination": (
            "The device may be contacting a previously unseen destination."
        ),
    }

    for signal in signals:
        if not isinstance(signal, dict):
            continue

        signal_type = signal.get("type", "unknown")
        deviation_factor = signal.get("deviation_factor")

        if (
            signal_type == "traffic_spike"
            and isinstance(deviation_factor, (int, float))
            and not isinstance(deviation_factor, bool)
        ):
            evidence.append(
                f"Outbound traffic is {float(deviation_factor):.1f}x above baseline."
            )
        else:
            evidence.append(
                str(signal.get("explanation") or f"Signal observed: {signal_type}.")
            )
        explanations.append(
            explanation_map.get(
                signal_type,
                f"The {signal_type} signal requires further investigation.",
            )
        )

        guidance = SIGNAL_GUIDANCE.get(signal_type)
        if guidance:
            action, reason = guidance
            if action not in seen_actions:
                actions.append({"action": action, "reason": reason})
                seen_actions.add(action)

    if not evidence:
        evidence.append(
            "No detailed anomaly signals were provided; inspect the underlying telemetry."
        )

    if not explanations:
        explanations.append(
            "There is insufficient evidence to establish a specific cause."
        )

    defaults = [
        (
            "Review DNS requests",
            "Check unexpected domains and unusual DNS query patterns.",
        ),
        (
            "Inspect outbound connections",
            "Review remote hosts, destination ports, and traffic volume.",
        ),
        (
            "Check running processes on host",
            "Identify processes responsible for unexpected network activity.",
        ),
        (
            "Verify device ownership",
            "Confirm whether the activity was expected for this device.",
        ),
        (
            "Consider network isolation if risk persists",
            "Follow incident-response policy if credible ongoing risk exists.",
        ),
    ]

    for action, reason in defaults:
        if len(actions) >= 5:
            break
        if action not in seen_actions:
            actions.append({"action": action, "reason": reason})
            seen_actions.add(action)

    check_first = [
        {
            "priority": index,
            "action": item["action"],
            "reason": item["reason"],
        }
        for index, item in enumerate(actions[:5], start=1)
    ]

    return {
        "alert_id": str(alert_id),
        "device_id": str(device_id),
        "summary": (
            f"Device {device_name} has network activity requiring investigation. "
            "The available signals do not establish a definitive cause."
        ),
        "observed_evidence": evidence,
        "possible_explanations": list(dict.fromkeys(explanations)),
        "check_first": check_first,
        "next_steps": [
            "Review relevant network and endpoint logs.",
            "Compare the evidence with expected device activity.",
            "Escalate according to incident-response policy if suspicious activity is confirmed.",
        ],
        "confidence": "medium" if signals else "low",
        "generated_by": "deterministic_fallback",
    }
