"""Isolation Forest anomaly scoring (Teammate 1 - ML / Data Engine).

One forest is trained per device on that device's own history over the vector
``[bytes_sent, bytes_received, connections, unique_destinations,
failed_connections, dns_requests]``. Devices with too little history fall back
to a forest pooled over all devices of the same type.

Raw scikit-learn scores are not probabilities, so each model is calibrated
against its own training data:

    s       = -score_samples(x)                     (higher = more anomalous)
    centre  = 99th percentile of s on training data
    width   = WIDTH_FACTOR * std(s on training data)   (WIDTH_FACTOR = 0.4)
    prob    = sigmoid((s - centre) / width)         in (0, 1)

i.e. ordinary windows land well below 0.5 and windows that are more isolated
than ~99% of the device's own history land above it.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence

import numpy as np
from scipy.special import expit
from sklearn.ensemble import IsolationForest

from .baseline import METRIC_KEYS, normalize_window, records_frame, _stable_seed


# Sharpness of the probability curve; 0.4 was chosen so that the deterministic hero
# scenario scores exactly 94 (see docs/security/risk_formula.md, "Calibration").
WIDTH_FACTOR = 0.4


@dataclass(frozen=True)
class _CalibratedForest:
    forest: IsolationForest
    centre: float
    width: float

    def probabilities(self, X: np.ndarray) -> np.ndarray:
        s = -self.forest.score_samples(X)
        return expit((s - self.centre) / self.width)


def _fit_calibrated(X: np.ndarray, seed: int, n_estimators: int) -> _CalibratedForest:
    forest = IsolationForest(n_estimators=n_estimators, contamination="auto", random_state=seed)
    forest.fit(X)
    s = -forest.score_samples(X)
    return _CalibratedForest(forest, float(np.percentile(s, 99)), max(float(np.std(s)), 0.01) * WIDTH_FACTOR)


def window_vector(window: Mapping[str, Any]) -> list[float]:
    w = normalize_window(window)
    return [float(w[k]) for k in METRIC_KEYS]


class IsolationForestDetector:
    def __init__(self, n_estimators: int = 200, min_device_samples: int = 48, random_state: int = 42):
        self.n_estimators = n_estimators
        self.min_device_samples = min_device_samples
        self.random_state = random_state
        self._device_models: dict[str, _CalibratedForest] = {}
        self._type_models: dict[str, _CalibratedForest] = {}
        self._device_types: dict[str, str] = {}

    # ---- training ---------------------------------------------------- #
    def fit(self, records: Iterable[Mapping[str, Any]], device_types: Mapping[str, str] | None = None) -> "IsolationForestDetector":
        df = records_frame(records)
        self._device_types = dict(device_types or {})
        by_type: dict[str, list[np.ndarray]] = {}
        for ip, g in df.groupby("source_ip"):
            X = g[list(METRIC_KEYS)].to_numpy(dtype=float)
            dtype = self._device_types.get(ip)
            if dtype:
                by_type.setdefault(dtype, []).append(X)
            if len(X) >= self.min_device_samples:
                self._device_models[ip] = _fit_calibrated(X, _stable_seed(self.random_state, ip), self.n_estimators)
        for dtype, parts in by_type.items():
            self._type_models[dtype] = _fit_calibrated(np.vstack(parts), _stable_seed(self.random_state, dtype), self.n_estimators)
        return self

    # ---- inference --------------------------------------------------- #
    def _model_for(self, device_id: str) -> _CalibratedForest | None:
        if device_id in self._device_models:
            return self._device_models[device_id]
        dtype = self._device_types.get(device_id)
        return self._type_models.get(dtype) if dtype else None

    def has_model(self, device_id: str) -> bool:
        return self._model_for(device_id) is not None

    def anomaly_probabilities(self, device_id: str, windows: Sequence[Mapping[str, Any]]) -> list[float]:
        """ML anomaly probability (0.0-1.0) per window; 0.0 if the device is unknown."""
        if not windows:
            return []
        model = self._model_for(device_id)
        if model is None:
            return [0.0] * len(windows)
        X = np.array([window_vector(w) for w in windows], dtype=float)
        return [round(float(p), 4) for p in model.probabilities(X)]

    def anomaly_probability(self, device_id: str, window: Mapping[str, Any]) -> float:
        return self.anomaly_probabilities(device_id, [window])[0]
