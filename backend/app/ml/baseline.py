"""Per-device behavioural baselines (Teammate 1 - ML / Data Engine).

Every device gets its *own* baseline (never a global one): mean and standard
deviation for each traffic metric, the hours of day in which it is normally
active, and the set of destinations it has been seen talking to.

Baselines are learned from *active-hour* windows only, so quiet overnight
background traffic does not drag the "normal working" averages down.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

import pandas as pd

METRIC_KEYS: tuple[str, ...] = (
    "bytes_sent",
    "bytes_received",
    "connections",
    "unique_destinations",
    "failed_connections",
    "dns_requests",
)

# Ratios are computed against max(baseline, MIN_BASELINE) so that a device whose
# normal failed-connection count is ~0 does not produce infinite deviations.
MIN_BASELINE = 1.0

# An hour of day counts as "active" if its mean connection count is at least
# this fraction of the device's busiest hour.
ACTIVE_HOUR_FRACTION = 0.25


# --------------------------------------------------------------------------- #
# Small shared helpers
# --------------------------------------------------------------------------- #
def clean_number(x: float) -> int | float:
    """Whole numbers become ints, everything else is rounded to 1 decimal."""
    x = float(x)
    return int(round(x)) if abs(x - round(x)) < 1e-9 else round(x, 1)


def _stable_seed(*parts: object) -> int:
    """Deterministic 31-bit seed from arbitrary parts (independent of PYTHONHASHSEED)."""
    return int(hashlib.md5(":".join(map(str, parts)).encode()).hexdigest()[:7], 16)


def parse_timestamp(ts: str | datetime) -> datetime:
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def normalize_window(window: Mapping[str, Any]) -> dict[str, Any]:
    """Accept a raw telemetry record *or* contract-style ``current_metrics``.

    Returns the six metric keys plus ``activity_hour`` / ``activity_time`` /
    ``timestamp`` / ``destination_ip`` / ``is_new_destination``.
    """
    ts = window.get("timestamp")
    dt = parse_timestamp(ts) if ts else None
    hour = window.get("activity_hour")
    if hour is None:
        if dt is None:
            raise ValueError("window needs either 'timestamp' or 'activity_hour'")
        hour = dt.hour
    out: dict[str, Any] = {}
    for key in METRIC_KEYS:
        alt = "connection_count" if key == "connections" else key
        if key in window:
            out[key] = window[key]
        elif alt in window:
            out[key] = window[alt]
        else:
            raise ValueError(f"window is missing metric '{key}'")
    out["activity_hour"] = int(hour)
    out["activity_time"] = dt.strftime("%H:%M") if dt else f"{int(hour):02d}:00"
    out["timestamp"] = dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None
    out["destination_ip"] = window.get("destination_ip")
    out["is_new_destination"] = bool(window.get("is_new_destination", False))
    return out


# --------------------------------------------------------------------------- #
# Baseline model
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class DeviceBaseline:
    device_id: str
    sample_count: int
    means: dict[str, float]
    stds: dict[str, float]
    active_hours_start: int
    active_hours_end: int  # exclusive; (0, 24) means "always active"
    known_destinations: frozenset[str] = field(default_factory=frozenset)

    def mean(self, key: str) -> float:
        return self.means[key]

    def effective(self, key: str) -> float:
        """Baseline mean floored at MIN_BASELINE (denominator for ratios)."""
        return max(self.means[key], MIN_BASELINE)

    def is_active_hour(self, hour: int) -> bool:
        return self.active_hours_start <= hour < self.active_hours_end

    def to_contract_dict(self) -> dict[str, int | float]:
        """Shape of ``baseline`` in shared/contracts/device_schema.json."""
        return {
            "avg_bytes_sent": clean_number(self.means["bytes_sent"]),
            "avg_bytes_received": clean_number(self.means["bytes_received"]),
            "avg_connections": clean_number(self.means["connections"]),
            "avg_unique_destinations": clean_number(self.means["unique_destinations"]),
            "avg_failed_connections": clean_number(self.means["failed_connections"]),
            "avg_dns_requests": clean_number(self.means["dns_requests"]),
            "active_hours_start": self.active_hours_start,
            "active_hours_end": self.active_hours_end,
        }

    def to_dict(self) -> dict[str, Any]:
        """Contract baseline plus standard deviations and sample size."""
        d: dict[str, Any] = self.to_contract_dict()
        d.update({f"std_{k}": round(v, 2) for k, v in self.stds.items()})
        d["sample_count"] = self.sample_count
        return d


def records_frame(records: Iterable[Mapping[str, Any]]) -> pd.DataFrame:
    """Telemetry records -> DataFrame with metric columns + ``hour``."""
    df = pd.DataFrame(list(records))
    if df.empty:
        raise ValueError("no telemetry records supplied")
    df = df.rename(columns={"connection_count": "connections"})
    df["hour"] = pd.to_datetime(df["timestamp"], utc=True).dt.hour
    return df


def derive_active_hours(hourly_mean_connections: pd.Series) -> tuple[int, int]:
    """Hours whose mean activity is >= 25% of the busiest hour form the window.

    Limitation: a single contiguous window is assumed (no overnight shifts that
    wrap past midnight).
    """
    peak = float(hourly_mean_connections.max())
    if peak <= 0:
        return 0, 24
    active = hourly_mean_connections[hourly_mean_connections >= ACTIVE_HOUR_FRACTION * peak].index
    if len(active) >= 24:
        return 0, 24
    return int(min(active)), int(max(active)) + 1


def _baseline_from_frame(device_id: str, g: pd.DataFrame) -> DeviceBaseline:
    start, end = derive_active_hours(g.groupby("hour")["connections"].mean())
    act = g[(g["hour"] >= start) & (g["hour"] < end)]
    if act.empty:
        raise ValueError(f"no active-hour records for device {device_id}")
    stds = act[list(METRIC_KEYS)].std(ddof=1).fillna(0.0)
    return DeviceBaseline(
        device_id=device_id,
        sample_count=int(len(act)),
        means={k: float(act[k].mean()) for k in METRIC_KEYS},
        stds={k: float(stds[k]) for k in METRIC_KEYS},
        active_hours_start=start,
        active_hours_end=end,
        known_destinations=frozenset(g["destination_ip"].dropna().unique()) if "destination_ip" in g else frozenset(),
    )


def compute_baseline(device_id: str, records: Iterable[Mapping[str, Any]]) -> DeviceBaseline:
    df = records_frame(records)
    g = df[df["source_ip"] == device_id]
    if g.empty:
        raise ValueError(f"no records for device {device_id}")
    return _baseline_from_frame(device_id, g)


def compute_all_baselines(records: Iterable[Mapping[str, Any]]) -> dict[str, DeviceBaseline]:
    df = records_frame(records)
    return {ip: _baseline_from_frame(ip, g) for ip, g in df.groupby("source_ip")}
