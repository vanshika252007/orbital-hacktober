import pytest

from backend.app.ml.risk_engine import (RiskConfig, build_anomaly_contract, compute_risk, primary_reason,
                                        severity_from_score, severity_to_status)


def sig(type_, severity, factor):
    return {"type": type_, "severity": severity, "measured_value": 1, "baseline_value": 1,
            "deviation_factor": factor, "explanation": "x"}


@pytest.mark.parametrize("score,sev", [(0, "LOW"), (30, "LOW"), (31, "MEDIUM"), (60, "MEDIUM"), (61, "HIGH"),
                                       (80, "HIGH"), (81, "CRITICAL"), (100, "CRITICAL")])
def test_severity_bands(score, sev):
    assert severity_from_score(score) == sev


def test_status_mapping():
    assert [severity_to_status(s) for s in ("LOW", "MEDIUM", "HIGH", "CRITICAL")] == ["healthy", "warning", "warning", "critical"]


def test_no_signals_ml_alone_can_never_alert():
    r = compute_risk([], 1.0)
    assert r.risk_score == 20 and r.severity == "LOW" and r.anomaly is False
    assert compute_risk([], 0.0).risk_score == 0


def test_single_mild_signal_does_not_alert():
    assert compute_risk([sig("traffic_spike", "LOW", 5.2)], 0.1).anomaly is False


def test_single_extreme_signal_alerts():
    r = compute_risk([sig("traffic_spike", "CRITICAL", 86.0)], 0.9)
    assert r.anomaly and r.severity == "MEDIUM"


def test_score_is_bounded_and_monotonic():
    base = [sig("traffic_spike", "HIGH", 12.0)]
    more = base + [sig("failed_connection_burst", "HIGH", 9.0)]
    assert compute_risk(more, 0.5).risk_score > compute_risk(base, 0.5).risk_score
    assert compute_risk(base, 0.9).risk_score > compute_risk(base, 0.1).risk_score
    huge = [sig(t, "CRITICAL", 1e6) for t in ("traffic_spike", "connection_burst", "destination_explosion", "failed_connection_burst", "unusual_hours", "new_external_destination")]
    assert compute_risk(huge, 1.0).risk_score <= 100


def test_components_are_reported_and_reproducible():
    signals = [sig("traffic_spike", "CRITICAL", 100.0), sig("unusual_hours", "HIGH", 5.0)]
    a, b = compute_risk(signals, 0.5), compute_risk(signals, 0.5)
    assert a == b
    assert a.components == {"signal_severity": 34.0, "deviation_size": pytest.approx(20 * 2 / 3), "breadth": 2.5, "ml": 10.0}


def test_custom_config_changes_score():
    signals = [sig("traffic_spike", "HIGH", 20.0)]
    assert compute_risk(signals, 0.5, RiskConfig(d_weight=0)).risk_score < compute_risk(signals, 0.5).risk_score


def test_primary_reason_is_hedged_and_ordered():
    text = primary_reason([sig("unusual_hours", "MEDIUM", 1.0), sig("traffic_spike", "CRITICAL", 50.0), sig("connection_burst", "HIGH", 9.0)])
    assert text.startswith("Significant deviation from baseline: outbound traffic spike")
    assert primary_reason([]) == "No significant deviation from baseline"
    lowered = text.lower()
    assert "malware" not in lowered and "hacker" not in lowered and "attack" not in lowered


def test_contract_shape():
    r = compute_risk([sig("traffic_spike", "CRITICAL", 86.0)], 0.9)
    c = build_anomaly_contract("1.2.3.4", "2026-10-24T03:17:00Z", [sig("traffic_spike", "CRITICAL", 86.0)], r)
    assert list(c) == ["device_id", "anomaly", "risk_score", "severity", "detected_at", "signals"]

from backend.app.ml.risk_engine import top_signals
from backend.app.simulation.data_generator import build_hero_anomaly_record


def test_top_signals_sorting_and_cap():
    signals = [
        {"type": "unusual_hours", "severity": "MEDIUM", "deviation_factor": 1.0},
        {"type": "traffic_spike", "severity": "HIGH", "deviation_factor": 86.0},
        {
            "type": "failed_connection_burst",
            "severity": "CRITICAL",
            "deviation_factor": 170.0,
        },
        {
            "type": "destination_explosion",
            "severity": "HIGH",
            "deviation_factor": 9.4,
        },
        {"type": "connection_burst", "severity": "LOW", "deviation_factor": 13.4},
    ]

    top_4 = top_signals(signals, n=4)

    assert len(top_4) == 4
    # Highest priority is CRITICAL
    assert top_4[0]["type"] == "failed_connection_burst"
    # Next highest are HIGH, ordered by higher deviation factor
    assert top_4[1]["type"] == "traffic_spike"
    assert top_4[2]["type"] == "destination_explosion"
    # Next is MEDIUM
    assert top_4[3]["type"] == "unusual_hours"


def test_top_signals_hero_ranking(engine):
    hero_record = build_hero_anomaly_record()
    res = engine.analyze("192.168.1.23", hero_record)

    top_4 = res.top_signals(n=4)
    assert len(top_4) == 4
    types = [s["type"] for s in top_4]
    assert types == [
        "failed_connection_burst",
        "traffic_spike",
        "destination_explosion",
        "unusual_hours",
    ]