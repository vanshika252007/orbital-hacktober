"""Rule engine (Teammate 1 - ML / Data Engine).

Evaluates one telemetry window against the device's *own* baseline and emits
structured signals matching the ``signals[]`` shape of
shared/contracts/anomaly_schema.json:

    {type, severity, measured_value, baseline_value, deviation_factor, explanation}

Rules (comparisons are strict ``>``):
    traffic_spike             bytes_sent          > 5x baseline
    connection_burst          connections         > 5x baseline
    destination_explosion     unique_destinations > 3x baseline
    failed_connection_burst   failed_connections  > 5x baseline
    unusual_hours             meaningful activity outside the active-hour window
    new_external_destination  contacted an external IP never seen in the baseline

Signal severity is driven by how far past its threshold a rule fired
(``deviation / threshold``): <1.5 LOW, <3 MEDIUM, <6 HIGH, otherwise CRITICAL.

Wording is deliberately hedged ("above baseline", "possible") - the platform
flags behavioural deviations, it does not assert compromise.
"""
from __future__ import annotations

import ipaddress
from typing import Any, Mapping

from .baseline import DeviceBaseline, clean_number, normalize_window

THRESHOLDS: dict[str, float] = {
    "traffic_spike": 5.0,
    "connection_burst": 5.0,
    "destination_explosion": 3.0,
    "failed_connection_burst": 5.0,
}

# Activity outside active hours only counts if the window shows real traffic:
# at least this many connections AND at least half of the device's normal count.
OFF_HOURS_MIN_CONNECTIONS = 5
OFF_HOURS_MIN_FRACTION = 0.5

# (signal type, metric key); thresholds live in THRESHOLDS
RATIO_RULES: tuple[tuple[str, str], ...] = (
    ("traffic_spike", "bytes_sent"),
    ("connection_burst", "connections"),
    ("destination_explosion", "unique_destinations"),
    ("failed_connection_burst", "failed_connections"),
)

# Signal types whose ``deviation_factor`` is a true measured/baseline ratio.
RATIO_SIGNAL_TYPES = frozenset(t for t, _ in RATIO_RULES)

SEVERITY_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

_PRIVATE_NETS = [ipaddress.ip_network(n) for n in
                 ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8", "169.254.0.0/16")]


def is_external_ip(ip: str | None) -> bool:
    """True for routable addresses (RFC 1918 / loopback / link-local are internal)."""
    if not ip:
        return False
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not any(addr in net for net in _PRIVATE_NETS)


def severity_for_ratio(ratio_to_threshold: float) -> str:
    if ratio_to_threshold < 1.5:
        return "LOW"
    if ratio_to_threshold < 3:
        return "MEDIUM"
    if ratio_to_threshold < 6:
        return "HIGH"
    return "CRITICAL"


def _trim(x: float) -> str:
    s = f"{x:.1f}"
    return s[:-2] if s.endswith(".0") else s


def format_bytes(n: float) -> str:
    """1024-based, e.g. 2 202 010 -> '2.1 MB', 25 600 -> '25 KB'."""
    if n >= 1024 ** 2:
        return f"{_trim(n / 1024 ** 2)} MB"
    if n >= 1024:
        return f"{_trim(n / 1024)} KB"
    return f"{int(round(n))} B"


def _signal(type_: str, severity: str, measured: float, baseline: float, factor: float, explanation: str) -> dict[str, Any]:
    return {
        "type": type_,
        "severity": severity,
        "measured_value": clean_number(measured),
        "baseline_value": clean_number(baseline),
        "deviation_factor": round(float(factor), 1),
        "explanation": explanation,
    }


def _explain_ratio(type_: str, measured: float, baseline: float, factor: float) -> str:
    f = f"{factor:.1f}x"
    if type_ == "traffic_spike":
        return f"Outbound traffic is {f} above baseline ({format_bytes(measured)} vs {format_bytes(baseline)} normal)"
    if type_ == "connection_burst":
        return f"Connection count is {f} above baseline ({_trim(measured)} vs {_trim(baseline)} normal)"
    if type_ == "destination_explosion":
        return (f"Contacted {_trim(measured)} unique destinations vs {_trim(baseline)} normal "
                f"({f} baseline)")
    return (f"{_trim(measured)} failed connection attempts vs {_trim(baseline)} normal ({f} baseline); "
            f"could indicate scanning or unreachable remote hosts")


def hours_outside_window(hour: int, start: int, end: int) -> tuple[int, int]:
    """(hours outside the window, nearest window boundary hour). 0 if inside."""
    if start <= hour < end:
        return 0, start
    dist_to_start = (start - hour) % 24
    dist_after_end = (hour - end + 1) % 24
    return (dist_to_start, start) if dist_to_start <= dist_after_end else (dist_after_end, end)


def evaluate(window: Mapping[str, Any], baseline: DeviceBaseline,
             thresholds: Mapping[str, float] | None = None) -> list[dict[str, Any]]:
    """Return the signals fired by ``window`` (empty list = nothing unusual)."""
    th = {**THRESHOLDS, **(thresholds or {})}
    w = normalize_window(window)
    signals: list[dict[str, Any]] = []

    for type_, key in RATIO_RULES:
        base = baseline.effective(key)
        measured = float(w[key])
        factor = measured / base
        if factor > th[type_]:
            signals.append(_signal(type_, severity_for_ratio(factor / th[type_]), measured, base, factor,
                                   _explain_ratio(type_, measured, base, factor)))

    # unusual_hours
    hour = w["activity_hour"]
    outside, boundary = hours_outside_window(hour, baseline.active_hours_start, baseline.active_hours_end)
    conns = float(w["connections"])
    if outside > 0 and conns >= max(OFF_HOURS_MIN_CONNECTIONS, OFF_HOURS_MIN_FRACTION * baseline.effective("connections")):
        sev = "HIGH" if outside >= 3 else "MEDIUM"
        signals.append(_signal(
            "unusual_hours", sev, hour, boundary, outside,
            f"Activity at {w['activity_time']} is outside this device's normal active hours "
            f"({baseline.active_hours_start:02d}:00-{baseline.active_hours_end:02d}:00)"))

    # new_external_destination
    dest = w["destination_ip"]
    if is_external_ip(dest):
        is_new = (dest not in baseline.known_destinations) if baseline.known_destinations else w["is_new_destination"]
        if is_new:
            signals.append(_signal("new_external_destination", "MEDIUM", 1, 0, 1.0,
                                   f"Contacted a previously unseen external destination ({dest})"))
    return signals
