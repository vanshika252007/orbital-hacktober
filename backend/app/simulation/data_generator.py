"""Synthetic network telemetry generator (Teammate 1 - ML / Data Engine).

Produces 7 days of *hourly* telemetry windows for 42 devices. Every window is
one log entry using the standard telemetry fields:

    timestamp, source_ip, destination_ip, source_port, destination_port,
    protocol, bytes_sent, bytes_received, packets, connection_count,
    unique_destinations, failed_connections, dns_requests,
    is_new_destination, is_unusual_hour

``destination_ip`` / ports / protocol describe the window's dominant flow; the
remaining counters are aggregates over the window.

Design notes
------------
* Fully deterministic: every device derives its own RNG from (SEED, ip), so the
  output is identical on every run and adding a device never shifts the others.
* Per-device mean calibration: after noise is applied, active-hour means are
  calibrated to the device's target profile so the computed baseline matches the
  profile (e.g. Student-Laptop -> 25 600 B sent / 32 connections, as in the
  shared device contract).
* The generated history is *clean* (no attacks). The hero anomaly used in the
  live demo comes from :func:`build_hero_anomaly_record`.

Run:  python -m backend.app.simulation.data_generator
"""
from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np

SEED = 42
HISTORY_DAYS = 7
HISTORY_START = datetime(2026, 10, 17, 0, 0, tzinfo=timezone.utc)  # 7 days -> ends 2026-10-24 00:00Z
OFF_HOURS_FACTOR = 0.04  # background traffic outside a device's active window

HERO_DEVICE_ID = "192.168.1.23"
HERO_TIMESTAMP = "2026-10-24T03:17:00Z"
HERO_DESTINATION_IP = "192.0.2.147"  # TEST-NET-1: external, never part of any device's history

DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parents[3] / "data" / "synthetic_network_logs.json"

# --------------------------------------------------------------------------- #
# Device catalogue (42 devices)
# --------------------------------------------------------------------------- #
# (ip, name, device type, traffic template)
ROSTER: list[tuple[str, str, str, str]] = [
    # --- Staff / faculty / student endpoints: 192.168.1.x (20) ---
    ("192.168.1.10", "Admin-Workstation", "Workstation", "office"),
    ("192.168.1.11", "Developer-MacBook", "Laptop", "office"),
    ("192.168.1.12", "Developer-Linux-Box", "Workstation", "office"),
    ("192.168.1.13", "Finance-PC", "Workstation", "office"),
    ("192.168.1.14", "HR-Desktop", "Workstation", "office"),
    ("192.168.1.15", "Reception-PC", "Workstation", "office"),
    ("192.168.1.16", "Marketing-iMac", "Workstation", "office"),
    ("192.168.1.17", "Design-Workstation", "Workstation", "office"),
    ("192.168.1.18", "Sales-Laptop-01", "Laptop", "office"),
    ("192.168.1.19", "Sales-Laptop-02", "Laptop", "office"),
    ("192.168.1.20", "Support-Desk-01", "Workstation", "office"),
    ("192.168.1.21", "Support-Desk-02", "Workstation", "office"),
    ("192.168.1.22", "Principal-Laptop", "Laptop", "office"),
    ("192.168.1.23", "Student-Laptop", "Workstation", "office"),  # hero device
    ("192.168.1.24", "Student-Laptop-02", "Laptop", "office"),
    ("192.168.1.25", "Faculty-Laptop-01", "Laptop", "office"),
    ("192.168.1.26", "Faculty-Laptop-02", "Laptop", "office"),
    ("192.168.1.27", "Accounts-PC", "Workstation", "office"),
    ("192.168.1.28", "Procurement-PC", "Workstation", "office"),
    ("192.168.1.29", "IT-Admin-Laptop", "Laptop", "office"),
    # --- Computer lab: 192.168.2.x (10) ---
    *[(f"192.168.2.{i}", f"Lab-PC-{i:02d}", "Lab Machine", "lab") for i in range(1, 11)],
    # --- Servers: 192.168.10.x (6) ---
    ("192.168.10.10", "Library-Server", "Server", "server"),
    ("192.168.10.11", "File-Server", "Server", "server"),
    ("192.168.10.12", "Print-Server", "Server", "server"),
    ("192.168.10.13", "Mail-Gateway", "Server", "server"),
    ("192.168.10.14", "DB-Server", "Server", "server"),
    ("192.168.10.15", "Web-Server", "Server", "server"),
    # --- IoT / facilities: 192.168.20.x (6) ---
    ("192.168.20.10", "Security-Camera-01", "IoT", "iot"),
    ("192.168.20.11", "Security-Camera-02", "IoT", "iot"),
    ("192.168.20.12", "Security-Camera-03", "IoT", "iot"),
    ("192.168.20.13", "Conference-Display", "IoT", "iot"),
    ("192.168.20.14", "Smart-Thermostat", "IoT", "iot"),
    ("192.168.20.15", "Badge-Reader", "IoT", "iot"),
]

# Target ranges for per-active-window means, by traffic template.
TEMPLATES: dict[str, dict[str, Any]] = {
    "office": {"sent": (18_000, 60_000), "recv": (80_000, 300_000), "conn": (20, 60), "uniq": (4, 9),
               "failed": (1, 3), "dns": (12, 40), "hours": (8, 22), "ports": (443, 443, 443, 80, 53, 445)},
    "lab": {"sent": (15_000, 45_000), "recv": (120_000, 400_000), "conn": (15, 45), "uniq": (3, 8),
            "failed": (1, 3), "dns": (10, 30), "hours": (9, 18), "ports": (443, 443, 80, 53, 22)},
    "server": {"sent": (400_000, 1_800_000), "recv": (250_000, 900_000), "conn": (150, 400), "uniq": (18, 45),
               "failed": (3, 8), "dns": (40, 100), "hours": (0, 24), "ports": (443, 445, 22, 3306, 53)},
    "iot": {"sent": (4_000, 90_000), "recv": (2_000, 40_000), "conn": (4, 14), "uniq": (1, 3),
            "failed": (0.3, 1.2), "dns": (2, 8), "hours": (0, 24), "ports": (443, 8883, 123, 53)},
}

# Hero device targets mirror shared/contracts/device_schema.json exactly.
HERO_PROFILE = {
    "mac": "00:1B:44:11:3A:B7", "sent": 25_600, "recv": 102_400, "conn": 32,
    "uniq": 5, "failed": 2, "dns": 18, "hours": (8, 22),
}


@dataclass(frozen=True)
class DeviceProfile:
    id: str
    name: str
    type: str
    ip: str
    mac: str
    template: str
    avg_bytes_sent: float
    avg_bytes_received: float
    avg_connections: float
    avg_unique_destinations: float
    avg_failed_connections: float
    avg_dns_requests: float
    active_hours_start: int
    active_hours_end: int
    dest_ports: tuple[int, ...]

    def to_dict(self) -> dict[str, Any]:
        d = {k: getattr(self, k) for k in self.__dataclass_fields__}
        d["dest_ports"] = list(self.dest_ports)
        return d


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _stable_int(*parts: object) -> int:
    return int(hashlib.md5(":".join(map(str, parts)).encode()).hexdigest()[:8], 16)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _mac_for(ip: str) -> str:
    h = hashlib.md5(f"mac:{ip}".encode()).hexdigest()
    return "00:1B:44:" + ":".join(h[i:i + 2].upper() for i in (0, 2, 4))


def build_profiles() -> list[DeviceProfile]:
    profiles: list[DeviceProfile] = []
    for ip, name, dtype, tmpl in ROSTER:
        t = TEMPLATES[tmpl]
        rng = random.Random(f"{SEED}:{ip}")
        vals = {
            "sent": int(rng.uniform(*t["sent"])), "recv": int(rng.uniform(*t["recv"])),
            "conn": max(1, round(rng.uniform(*t["conn"]))), "uniq": max(1, round(rng.uniform(*t["uniq"]))),
            "failed": round(rng.uniform(*t["failed"]), 1) if tmpl == "iot" else float(round(rng.uniform(*t["failed"]))),
            "dns": max(1, round(rng.uniform(*t["dns"]))), "hours": t["hours"], "mac": _mac_for(ip),
        }
        if ip == HERO_DEVICE_ID:
            vals = dict(HERO_PROFILE)
        profiles.append(DeviceProfile(
            id=ip, name=name, type=dtype, ip=ip, mac=vals["mac"], template=tmpl,
            avg_bytes_sent=float(vals["sent"]), avg_bytes_received=float(vals["recv"]),
            avg_connections=float(vals["conn"]), avg_unique_destinations=float(vals["uniq"]),
            avg_failed_connections=float(vals["failed"]), avg_dns_requests=float(vals["dns"]),
            active_hours_start=vals["hours"][0], active_hours_end=vals["hours"][1],
            dest_ports=tuple(t["ports"]),
        ))
    return profiles


def _diurnal(hour: int, start: int, end: int) -> float:
    """Multiplier on the mean for a given hour of day."""
    if end - start >= 24:  # 24/7 device: gentle daily wave
        return 1.0 + 0.15 * math.sin(2 * math.pi * (hour - 6) / 24)
    if start <= hour < end:
        return 0.8 + 0.4 * math.sin(math.pi * (hour - start + 0.5) / (end - start))
    return OFF_HOURS_FACTOR


def _calibrate(values: np.ndarray, target_mean: float, active: np.ndarray) -> np.ndarray:
    """Round to ints so that the mean over active windows equals ``target_mean``."""
    v = values.astype(float).copy()
    cur = v[active].mean()
    if cur > 0:
        v[active] *= target_mean / cur
    out = np.rint(v).astype(np.int64)
    idx = np.flatnonzero(active)
    residual = int(round(target_mean * len(idx))) - int(out[idx].sum())
    step = 1 if residual > 0 else -1
    i = 0
    while residual != 0:
        j = idx[i % len(idx)]
        if out[j] + step >= 0:
            out[j] += step
            residual -= step
        i += 1
    return out


def _external_pool(rng: random.Random, size: int) -> list[str]:
    candidates = [f"198.51.100.{i}" for i in range(1, 61)] + [f"203.0.113.{i}" for i in range(1, 61)]
    return rng.sample(candidates, size)


def generate_device_records(profile: DeviceProfile) -> list[dict[str, Any]]:
    n = HISTORY_DAYS * 24
    start, end = profile.active_hours_start, profile.active_hours_end
    rng_np = np.random.default_rng(_stable_int(SEED, profile.ip))
    rng = random.Random(f"{SEED}:flows:{profile.ip}")

    hours = np.arange(n) % 24
    mult = np.array([_diurnal(int(h), start, end) for h in hours])
    active = np.array([start <= h < end for h in hours])
    shared = rng_np.normal(0, 0.12, n)

    def series(target: float) -> np.ndarray:
        return target * mult * np.exp(shared + rng_np.normal(0, 0.10, n))

    sent = _calibrate(series(profile.avg_bytes_sent), profile.avg_bytes_sent, active)
    recv = _calibrate(series(profile.avg_bytes_received), profile.avg_bytes_received, active)
    conn = _calibrate(series(profile.avg_connections), profile.avg_connections, active)
    uniq = _calibrate(series(profile.avg_unique_destinations), profile.avg_unique_destinations, active)
    failed = _calibrate(series(profile.avg_failed_connections), profile.avg_failed_connections, active)
    dns = _calibrate(series(profile.avg_dns_requests), profile.avg_dns_requests, active)

    pool = _external_pool(rng, 14 if profile.template == "server" else 8)
    weights = [1 / (i + 1) for i in range(len(pool))]  # Zipf-ish: a few favourite destinations
    seen: set[str] = set()
    records: list[dict[str, Any]] = []
    for i in range(n):
        dest = rng.choices(pool, weights)[0]
        dport = rng.choice(profile.dest_ports)
        is_new = dest not in seen
        seen.add(dest)
        total_bytes = int(sent[i] + recv[i])
        records.append({
            "timestamp": _iso(HISTORY_START + timedelta(hours=i)),
            "source_ip": profile.ip,
            "destination_ip": dest,
            "source_port": rng.randint(49152, 65535),
            "destination_port": dport,
            "protocol": "UDP" if dport in (53, 123) else "TCP",
            "bytes_sent": int(sent[i]),
            "bytes_received": int(recv[i]),
            "packets": max(1, total_bytes // rng.randint(700, 1100)),
            "connection_count": int(conn[i]),
            "unique_destinations": int(uniq[i]),
            "failed_connections": int(failed[i]),
            "dns_requests": int(dns[i]),
            "is_new_destination": is_new,
            "is_unusual_hour": not bool(active[i]),
        })
    return records


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def generate_dataset() -> dict[str, Any]:
    """Return the full clean dataset: ``{"meta", "devices", "records"}``."""
    profiles = build_profiles()
    records: list[dict[str, Any]] = []
    for p in profiles:
        records.extend(generate_device_records(p))
    records.sort(key=lambda r: (r["timestamp"], r["source_ip"]))
    return {
        "meta": {
            "description": "Synthetic clean-baseline network telemetry (hourly windows per device)",
            "seed": SEED,
            "device_count": len(profiles),
            "record_count": len(records),
            "history_start": _iso(HISTORY_START),
            "history_hours": HISTORY_DAYS * 24,
            "window": "1h",
        },
        "devices": [p.to_dict() for p in profiles],
        "records": records,
    }


def build_hero_anomaly_record(timestamp: str = HERO_TIMESTAMP) -> dict[str, Any]:
    """Deterministic hero anomaly window for Student-Laptop (192.168.1.23).

    Values mirror shared/contracts/device_schema.json ``current_metrics``.
    """
    return {
        "timestamp": timestamp,
        "source_ip": HERO_DEVICE_ID,
        "destination_ip": HERO_DESTINATION_IP,
        "source_port": 51734,
        "destination_port": 8443,
        "protocol": "TCP",
        "bytes_sent": 2_202_010,
        "bytes_received": 512_000,
        "packets": 3_150,
        "connection_count": 430,
        "unique_destinations": 47,
        "failed_connections": 340,
        "dns_requests": 180,
        "is_new_destination": True,
        "is_unusual_hour": True,
    }


def write_dataset(path: Path | str = DEFAULT_OUTPUT_PATH, dataset: dict[str, Any] | None = None) -> Path:
    """Write the dataset as JSON (one record per line so diffs stay readable)."""
    dataset = dataset or generate_dataset()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        f.write('{\n"meta": ' + json.dumps(dataset["meta"]) + ',\n')
        f.write('"devices": [\n' + ",\n".join(json.dumps(d) for d in dataset["devices"]) + '\n],\n')
        f.write('"records": [\n' + ",\n".join(json.dumps(r, separators=(",", ":")) for r in dataset["records"]) + '\n]\n}\n')
    return path


def load_dataset(path: Path | str = DEFAULT_OUTPUT_PATH) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    out = write_dataset()
    ds = load_dataset(out)
    print(f"Wrote {ds['meta']['record_count']} records for {ds['meta']['device_count']} devices -> {out}")
