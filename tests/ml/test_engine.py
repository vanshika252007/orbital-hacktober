"""End-to-end: clean history stays quiet, the hero scenario produces the demo numbers."""
from collections import defaultdict

from backend.app.simulation.data_generator import build_hero_anomaly_record

HERO = "192.168.1.23"


def test_clean_history_produces_zero_anomalies_and_zero_signals(engine, dataset):
    by_device = defaultdict(list)
    for r in dataset["records"]:
        by_device[r["source_ip"]].append(r)
    total = 0
    for ip, recs in by_device.items():
        for res in engine.analyze_batch(ip, recs):
            total += 1
            assert res.signals == [], f"{ip} {res.detected_at}"
            assert not res.anomaly and res.severity == "LOW" and res.status == "healthy"
            assert res.risk_score <= 20
    assert total == 7056


def test_hero_scenario_risk_score_is_94_critical(engine):
    res = engine.analyze(HERO, build_hero_anomaly_record())
    assert res.anomaly is True
    assert res.risk_score == 94
    assert res.severity == "CRITICAL" and res.status == "critical"
    assert res.detected_at == "2026-10-24T03:17:00Z"


def test_hero_signals_cover_the_demo_evidence(engine):
    res = engine.analyze(HERO, build_hero_anomaly_record())
    by_type = {s["type"]: s for s in res.signals}
    assert {"traffic_spike", "destination_explosion", "failed_connection_burst", "unusual_hours"} <= set(by_type)
    assert by_type["traffic_spike"]["measured_value"] == 2_202_010 and by_type["traffic_spike"]["baseline_value"] == 25_600
    assert by_type["destination_explosion"]["measured_value"] == 47 and by_type["destination_explosion"]["baseline_value"] == 5
    assert by_type["failed_connection_burst"]["measured_value"] == 340 and by_type["failed_connection_burst"]["baseline_value"] == 2
    assert by_type["unusual_hours"]["measured_value"] == 3
    assert "03:17" in by_type["unusual_hours"]["explanation"] and "08:00-22:00" in by_type["unusual_hours"]["explanation"]
    assert by_type["connection_burst"]["measured_value"] == 430 and by_type["connection_burst"]["baseline_value"] == 32


def test_hero_anomaly_contract_shape(engine):
    c = engine.analyze(HERO, build_hero_anomaly_record()).to_anomaly_contract()
    assert list(c) == ["device_id", "anomaly", "risk_score", "severity", "detected_at", "signals"]
    assert c["device_id"] == HERO and c["anomaly"] is True
    for s in c["signals"]:
        assert set(s) == {"type", "severity", "measured_value", "baseline_value", "deviation_factor", "explanation"}


def test_hero_current_metrics_match_device_contract(engine):
    assert engine.analyze(HERO, build_hero_anomaly_record()).current_metrics == {
        "bytes_sent": 2_202_010, "bytes_received": 512_000, "connections": 430,
        "unique_destinations": 47, "failed_connections": 340, "dns_requests": 180, "activity_hour": 3,
    }


def test_same_traffic_is_judged_against_each_devices_own_baseline(engine):
    """A busy file server's normal volume must look suspicious on a quiet laptop but not on the server."""
    server = "192.168.10.14"
    window = {"timestamp": "2026-10-23T12:00:00Z", **{k: engine.baselines[server].mean(k) for k in
              ("bytes_sent", "bytes_received", "unique_destinations", "failed_connections", "dns_requests")},
              "connection_count": engine.baselines[server].mean("connections"), "destination_ip": sorted(engine.baselines[server].known_destinations)[0]}
    assert engine.analyze(HERO, window).anomaly is True   # destination is new to the laptop too
    assert engine.analyze(server, window).signals == []


def test_unknown_device_raises(engine):
    import pytest
    with pytest.raises(KeyError):
        engine.analyze("10.9.9.9", build_hero_anomaly_record())
