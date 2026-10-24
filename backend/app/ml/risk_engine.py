"""Deterministic risk score engine (Teammate 1 - ML / Data Engine).

risk_score (0-100) = A + B + C + D, each component transparent and capped:

    A  Signal severity   min(A_CAP, sum of per-signal points)
                         LOW=4, MEDIUM=8, HIGH=14, CRITICAL=20
    B  Deviation size    B_WEIGHT * min(1, log10(max ratio deviation) / log10(B_FULL_AT_FACTOR))
                         (only ratio-type signals; 1x -> 0, B_FULL_AT_FACTOR x -> full weight)
    C  Signal breadth    C_WEIGHT * min(1, (n_signals - 1) / (C_FULL_AT_SIGNALS - 1))
    D  ML component      D_WEIGHT * isolation_forest_probability

Severity bands: 0-30 LOW, 31-60 MEDIUM, 61-80 HIGH, 81-100 CRITICAL.
A window is an *anomaly* when its score is above the LOW band (> 30).

Because D is capped at 20, the ML model alone can never push a device above
LOW - an alert always needs at least one explainable rule signal behind it.
See docs/security/risk_formula.md for the full write-up and worked example.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, Sequence

from .rules import RATIO_SIGNAL_TYPES, SEVERITY_RANK


@dataclass(frozen=True)
class RiskConfig:
    severity_points: Mapping[str, float] = field(default_factory=lambda: {"LOW": 4, "MEDIUM": 8, "HIGH": 14, "CRITICAL": 20})
    a_cap: float = 50.0
    b_weight: float = 20.0
    b_full_at_factor: float = 1000.0
    c_weight: float = 10.0
    c_full_at_signals: int = 5
    d_weight: float = 20.0


DEFAULT_RISK_CONFIG = RiskConfig()

SEVERITY_BANDS: tuple[tuple[int, str], ...] = ((30, "LOW"), (60, "MEDIUM"), (80, "HIGH"), (100, "CRITICAL"))


def severity_from_score(score: int | float) -> str:
    for upper, name in SEVERITY_BANDS:
        if score <= upper:
            return name
    return "CRITICAL"


def severity_to_status(severity: str) -> str:
    """Device ``status`` for shared/contracts/device_schema.json."""
    return {"LOW": "healthy", "MEDIUM": "warning", "HIGH": "warning", "CRITICAL": "critical"}[severity]


@dataclass(frozen=True)
class RiskResult:
    risk_score: int
    severity: str
    anomaly: bool
    components: dict[str, float]  # A, B, C, D (unrounded) for explainability


def compute_risk(signals: Sequence[Mapping[str, Any]], ml_probability: float,
                 config: RiskConfig = DEFAULT_RISK_CONFIG) -> RiskResult:
    n = len(signals)
    a = min(config.a_cap, sum(config.severity_points[s["severity"]] for s in signals))

    ratios = [s["deviation_factor"] for s in signals if s["type"] in RATIO_SIGNAL_TYPES]
    max_ratio = max(ratios, default=1.0)
    b = config.b_weight * min(1.0, math.log10(max_ratio) / math.log10(config.b_full_at_factor)) if max_ratio > 1 else 0.0

    c = config.c_weight * min(1.0, (n - 1) / (config.c_full_at_signals - 1)) if n > 0 else 0.0
    p = min(1.0, max(0.0, float(ml_probability)))
    d = config.d_weight * p

    total = a + b + c + d
    score = max(0, min(100, math.floor(total + 0.5)))
    sev = severity_from_score(score)
    return RiskResult(score, sev, score > 30, {"signal_severity": a, "deviation_size": b, "breadth": c, "ml": d})


_REASON_PHRASES = {
    "traffic_spike": "outbound traffic spike",
    "connection_burst": "burst of connections",
    "destination_explosion": "unusually many unique destinations",
    "failed_connection_burst": "high connection failure rate",
    "unusual_hours": "activity outside normal hours",
    "new_external_destination": "contact with a previously unseen external host",
}


def primary_reason(signals: Iterable[Mapping[str, Any]], max_items: int = 3) -> str:
    """One-line, hedged summary for ``primary_reason`` in the alert contract."""
    ranked = sorted(signals, key=lambda s: (SEVERITY_RANK[s["severity"]], s["deviation_factor"]), reverse=True)
    phrases = [_REASON_PHRASES.get(s["type"], s["type"].replace("_", " ")) for s in ranked[:max_items]]
    if not phrases:
        return "No significant deviation from baseline"
    body = phrases[0] if len(phrases) == 1 else ", ".join(phrases[:-1]) + " and " + phrases[-1]
    return f"Significant deviation from baseline: {body}"


def build_anomaly_contract(device_id: str, detected_at: str, signals: Sequence[Mapping[str, Any]], risk: RiskResult) -> dict[str, Any]:
    """Exact shape of shared/contracts/anomaly_schema.json."""
    return {
        "device_id": device_id,
        "anomaly": risk.anomaly,
        "risk_score": risk.risk_score,
        "severity": risk.severity,
        "detected_at": detected_at,
        "signals": [dict(s) for s in signals],
    }

from backend.app.ml.rules import SEVERITY_RANK

DEFAULT_EVIDENCE_COUNT = 4


def top_signals(signals, n=DEFAULT_EVIDENCE_COUNT):
    """Returns top N signals sorted by severity (CRITICAL > HIGH > MEDIUM > LOW),

    then by deviation_factor descending.
    """
    ranked = sorted(
        signals,
        key=lambda s: (SEVERITY_RANK[s["severity"]], s["deviation_factor"]),
        reverse=True,
    )
    return [dict(s) for s in ranked[:n]]

