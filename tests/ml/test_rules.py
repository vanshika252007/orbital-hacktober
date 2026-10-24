import pytest

from backend.app.ml.baseline import DeviceBaseline
from backend.app.ml.rules import (evaluate, format_bytes, hours_outside_window, is_external_ip, severity_for_ratio)


@pytest.fixture
def baseline():
    return DeviceBaseline(
        device_id="192.168.1.50", sample_count=100,
        means={"bytes_sent": 10_000.0, "bytes_received": 50_000.0, "connections": 20.0,
               "unique_destinations": 4.0, "failed_connections": 2.0, "dns_requests": 10.0},
        stds={k: 1.0 for k in ("bytes_sent", "bytes_received", "connections", "unique_destinations", "failed_connections", "dns_requests")},
        active_hours_start=8, active_hours_end=22, known_destinations=frozenset({"198.51.100.5"}),
    )


def window(**over):
    w = {"timestamp": "2026-10-20T12:00:00Z", "bytes_sent": 10_000, "bytes_received": 50_000, "connection_count": 20,
         "unique_destinations": 4, "failed_connections": 2, "dns_requests": 10, "destination_ip": "198.51.100.5"}
    w.update(over)
    return w


def types(signals):
    return [s["type"] for s in signals]


def test_normal_window_fires_nothing(baseline):
    assert evaluate(window(), baseline) == []


@pytest.mark.parametrize("field,base,thr,sig", [
    ("bytes_sent", 10_000, 5, "traffic_spike"),
    ("connection_count", 20, 5, "connection_burst"),
    ("unique_destinations", 4, 3, "destination_explosion"),
    ("failed_connections", 2, 5, "failed_connection_burst"),
])
def test_ratio_rules_are_strictly_greater_than_threshold(baseline, field, base, thr, sig):
    assert sig not in types(evaluate(window(**{field: base * thr}), baseline))       # exactly at threshold
    fired = evaluate(window(**{field: base * thr + 1}), baseline)                     # just over
    assert sig in types(fired)


def test_signal_shape_and_explanation(baseline):
    (s,) = evaluate(window(bytes_sent=2_202_010), baseline)
    assert set(s) == {"type", "severity", "measured_value", "baseline_value", "deviation_factor", "explanation"}
    assert s["type"] == "traffic_spike" and s["measured_value"] == 2_202_010 and s["baseline_value"] == 10_000
    assert s["deviation_factor"] == 220.2
    assert "220.2x above baseline" in s["explanation"] and "2.1 MB" in s["explanation"]


def test_severity_bands():
    assert [severity_for_ratio(x) for x in (1.2, 1.5, 2.9, 3, 5.9, 6, 40)] == \
        ["LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL", "CRITICAL"]


def test_unusual_hours_requires_real_activity(baseline):
    quiet = evaluate(window(timestamp="2026-10-20T03:00:00Z", connection_count=1), baseline)
    assert "unusual_hours" not in types(quiet)
    busy = evaluate(window(timestamp="2026-10-20T03:17:00Z", connection_count=12), baseline)
    (s,) = [x for x in busy if x["type"] == "unusual_hours"]
    assert s["severity"] == "HIGH" and s["deviation_factor"] == 5.0 and "03:17" in s["explanation"]
    assert "08:00-22:00" in s["explanation"]


def test_unusual_hours_medium_just_outside_window(baseline):
    (s,) = [x for x in evaluate(window(timestamp="2026-10-20T22:30:00Z", connection_count=15), baseline) if x["type"] == "unusual_hours"]
    assert s["severity"] == "MEDIUM" and s["deviation_factor"] == 1.0


def test_hours_outside_window_math():
    assert hours_outside_window(12, 8, 22) == (0, 8)
    assert hours_outside_window(3, 8, 22) == (5, 8)
    assert hours_outside_window(23, 8, 22) == (2, 22)
    assert hours_outside_window(5, 0, 24) == (0, 0)


def test_new_external_destination(baseline):
    assert "new_external_destination" in types(evaluate(window(destination_ip="192.0.2.147"), baseline))
    assert "new_external_destination" not in types(evaluate(window(destination_ip="198.51.100.5"), baseline))
    assert "new_external_destination" not in types(evaluate(window(destination_ip="192.168.1.99"), baseline))  # internal


def test_helpers():
    assert is_external_ip("8.8.8.8") and is_external_ip("192.0.2.147")
    assert not is_external_ip("10.1.2.3") and not is_external_ip("172.20.0.1") and not is_external_ip("192.168.1.1")
    assert not is_external_ip(None) and not is_external_ip("not-an-ip")
    assert format_bytes(2_202_010) == "2.1 MB" and format_bytes(25_600) == "25 KB" and format_bytes(512) == "512 B"


def test_zero_baseline_does_not_divide_by_zero(baseline):
    z = DeviceBaseline("x", 10, {**baseline.means, "failed_connections": 0.0}, baseline.stds, 8, 22)
    assert "failed_connection_burst" not in types(evaluate(window(failed_connections=5), z))   # 5 == 5 x floor(1)
    assert "failed_connection_burst" in types(evaluate(window(failed_connections=6), z))
