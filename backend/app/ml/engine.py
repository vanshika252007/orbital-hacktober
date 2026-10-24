"""AnomalyEngine - the single integration point for Teammate 2 (Backend).

    from backend.app.ml import AnomalyEngine
    from backend.app.simulation.data_generator import generate_dataset, build_hero_anomaly_record

    engine = AnomalyEngine.from_dataset(generate_dataset())     # or load_dataset(path)
    result = engine.analyze("192.168.1.23", build_hero_anomaly_record())
    result.to_anomaly_contract()    # -> shared/contracts/anomaly_schema.json shape
    result.current_metrics          # -> device_schema.json "current_metrics"
    engine.baselines["192.168.1.23"].to_contract_dict()   # -> device_schema.json "baseline"

The engine is stateless after construction (no DB, no I/O), so the backend can
build it once at startup and call ``analyze`` for every simulated window.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, Sequence

from . import rules
from .baseline import DeviceBaseline, compute_all_baselines, normalize_window
from .isolation_forest import IsolationForestDetector
from .risk_engine import (DEFAULT_RISK_CONFIG, RiskConfig, RiskResult, build_anomaly_contract, compute_risk,
                          primary_reason, severity_to_status)

_CURRENT_METRIC_KEYS = ("bytes_sent", "bytes_received", "connections", "unique_destinations",
                        "failed_connections", "dns_requests", "activity_hour")


@dataclass(frozen=True)
class AnalysisResult:
    device_id: str
    detected_at: str
    current_metrics: dict[str, Any]
    signals: list[dict[str, Any]]
    ml_probability: float
    risk: RiskResult

    @property
    def anomaly(self) -> bool:
        return self.risk.anomaly

    @property
    def risk_score(self) -> int:
        return self.risk.risk_score

    @property
    def severity(self) -> str:
        return self.risk.severity

    @property
    def status(self) -> str:
        """healthy / warning / critical (device_schema.json ``status``)."""
        return severity_to_status(self.risk.severity)

    @property
    def primary_reason(self) -> str:
        return primary_reason(self.signals)

    def to_anomaly_contract(self) -> dict[str, Any]:
        return build_anomaly_contract(self.device_id, self.detected_at, self.signals, self.risk)


class AnomalyEngine:
    def __init__(self, baselines: Mapping[str, DeviceBaseline], detector: IsolationForestDetector,
                 risk_config: RiskConfig = DEFAULT_RISK_CONFIG):
        self.baselines = dict(baselines)
        self.detector = detector
        self.risk_config = risk_config

    # ---- construction ------------------------------------------------ #
    @classmethod
    def from_records(cls, records: Sequence[Mapping[str, Any]], device_types: Mapping[str, str] | None = None,
                     risk_config: RiskConfig = DEFAULT_RISK_CONFIG) -> "AnomalyEngine":
        baselines = compute_all_baselines(records)
        detector = IsolationForestDetector().fit(records, device_types)
        return cls(baselines, detector, risk_config)

    @classmethod
    def from_dataset(cls, dataset: Mapping[str, Any], risk_config: RiskConfig = DEFAULT_RISK_CONFIG) -> "AnomalyEngine":
        types = {d["id"]: d["type"] for d in dataset.get("devices", [])}
        return cls.from_records(dataset["records"], types, risk_config)

    # ---- analysis ---------------------------------------------------- #
    def analyze_batch(self, device_id: str, windows: Sequence[Mapping[str, Any]]) -> list[AnalysisResult]:
        if device_id not in self.baselines:
            raise KeyError(f"unknown device: {device_id}")
        baseline = self.baselines[device_id]
        probs = self.detector.anomaly_probabilities(device_id, windows)
        results = []
        for window, p in zip(windows, probs):
            w = normalize_window(window)
            signals = rules.evaluate(window, baseline)
            risk = compute_risk(signals, p, self.risk_config)
            results.append(AnalysisResult(
                device_id=device_id,
                detected_at=w["timestamp"] or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                current_metrics={k: w[k] for k in _CURRENT_METRIC_KEYS},
                signals=signals,
                ml_probability=p,
                risk=risk,
            ))
        return results

    def analyze(self, device_id: str, window: Mapping[str, Any]) -> AnalysisResult:
        return self.analyze_batch(device_id, [window])[0]
