import numpy as np

from backend.app.ml.isolation_forest import IsolationForestDetector
from backend.app.simulation.data_generator import build_hero_anomaly_record


def test_probabilities_are_bounded_and_low_on_normal_history(engine, dataset):
    recs = [r for r in dataset["records"] if r["source_ip"] == "192.168.1.23"]
    p = np.array(engine.detector.anomaly_probabilities("192.168.1.23", recs))
    assert ((p >= 0) & (p <= 1)).all()
    assert p.mean() < 0.15


def test_hero_is_scored_as_highly_anomalous(engine):
    assert engine.detector.anomaly_probability("192.168.1.23", build_hero_anomaly_record()) > 0.9


def test_models_are_per_device(engine):
    hero = build_hero_anomaly_record()
    server_p = engine.detector.anomaly_probability("192.168.10.14", hero)   # hero volumes vs a server's own history
    laptop_p = engine.detector.anomaly_probability("192.168.1.23", hero)
    assert laptop_p > server_p or laptop_p > 0.9
    assert all(engine.detector.has_model(d) for d in engine.baselines)


def test_training_is_deterministic(dataset):
    types = {d["id"]: d["type"] for d in dataset["devices"]}
    recs = [r for r in dataset["records"] if r["source_ip"] in ("192.168.1.23", "192.168.1.24")]
    a = IsolationForestDetector(n_estimators=50).fit(recs, types)
    b = IsolationForestDetector(n_estimators=50).fit(recs, types)
    hero = build_hero_anomaly_record()
    assert a.anomaly_probability("192.168.1.23", hero) == b.anomaly_probability("192.168.1.23", hero)


def test_device_type_fallback_and_unknown_device(dataset):
    types = {d["id"]: d["type"] for d in dataset["devices"]}
    recs = [r for r in dataset["records"] if r["source_ip"] in ("192.168.1.23", "192.168.1.24")]
    det = IsolationForestDetector(n_estimators=50, min_device_samples=10_000).fit(recs, types)   # no per-device model
    assert det.has_model("192.168.1.23")                       # served by pooled Workstation/Laptop model
    assert det.anomaly_probability("10.9.9.9", build_hero_anomaly_record()) == 0.0
    assert det.anomaly_probabilities("192.168.1.23", []) == []
