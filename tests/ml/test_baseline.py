import pytest

from backend.app.ml.baseline import compute_all_baselines, compute_baseline, normalize_window


def test_hero_baseline_matches_device_contract(engine):
    assert engine.baselines["192.168.1.23"].to_contract_dict() == {
        "avg_bytes_sent": 25600, "avg_bytes_received": 102400, "avg_connections": 32,
        "avg_unique_destinations": 5, "avg_failed_connections": 2, "avg_dns_requests": 18,
        "active_hours_start": 8, "active_hours_end": 22,
    }


def test_baselines_are_per_device_not_global(engine):
    server = engine.baselines["192.168.10.14"]
    camera = engine.baselines["192.168.20.10"]
    laptop = engine.baselines["192.168.1.23"]
    assert server.mean("bytes_sent") > 10 * laptop.mean("bytes_sent")
    assert camera.mean("connections") < laptop.mean("connections") < server.mean("connections")
    assert len(engine.baselines) == 42


def test_active_hours_derived_per_device(engine):
    assert (engine.baselines["192.168.1.23"].active_hours_start, engine.baselines["192.168.1.23"].active_hours_end) == (8, 22)
    assert (engine.baselines["192.168.2.7"].active_hours_start, engine.baselines["192.168.2.7"].active_hours_end) == (9, 18)
    assert (engine.baselines["192.168.10.10"].active_hours_start, engine.baselines["192.168.10.10"].active_hours_end) == (0, 24)


def test_std_and_known_destinations(engine):
    b = engine.baselines["192.168.1.23"]
    assert all(v > 0 for v in b.stds.values())
    assert len(b.known_destinations) >= 5
    assert "std_bytes_sent" in b.to_dict() and b.to_dict()["sample_count"] == 98


def test_compute_baseline_single_device(dataset):
    b = compute_baseline("192.168.1.23", dataset["records"])
    assert b.mean("connections") == 32
    with pytest.raises(ValueError):
        compute_baseline("10.9.9.9", dataset["records"])


def test_normalize_window_accepts_record_and_contract_forms():
    rec = {"timestamp": "2026-10-24T03:17:00Z", "bytes_sent": 1, "bytes_received": 2, "connection_count": 3,
           "unique_destinations": 4, "failed_connections": 5, "dns_requests": 6}
    contract = {"bytes_sent": 1, "bytes_received": 2, "connections": 3, "unique_destinations": 4,
                "failed_connections": 5, "dns_requests": 6, "activity_hour": 3}
    a, b = normalize_window(rec), normalize_window(contract)
    assert a["connections"] == b["connections"] == 3 and a["activity_hour"] == b["activity_hour"] == 3
    assert a["activity_time"] == "03:17" and a["timestamp"] == "2026-10-24T03:17:00Z"
    with pytest.raises(ValueError):
        normalize_window({"bytes_sent": 1, "activity_hour": 3})


def test_all_baselines_empty_input_rejected():
    with pytest.raises(ValueError):
        compute_all_baselines([])
