"""
FastAPI application entry-point - Teammate 2 (Backend/Platform).

Initialises:
  - SQLite database (auto-creates tables on startup)
  - Device seeding from Teammate 1's data generator profiles
  - Historical timeline seeding from synthetic log records
  - CORS middleware for the React frontend
  - OpenAPI docs at /docs
"""
from __future__ import annotations

import os
import sys
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before anything else
load_dotenv()

from backend.app.api.router import api_router
from backend.app.services.database import create_tables, SessionLocal
from backend.app.services.device_service import seed_devices
from backend.app.models import TimelineEvent, Device

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Startup / shutdown lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise the database, seed devices, and seed timeline on startup."""
    logger.info("Network Anomaly Spotter API starting up…")
    create_tables()

    db = SessionLocal()
    try:
        _seed_all(db)
    except Exception as exc:
        logger.warning(f"Seeding failed (non-fatal): {exc}")
    finally:
        db.close()

    logger.info("Startup complete. OpenAPI docs at /docs")
    yield
    logger.info("Shutting down.")


def _seed_all(db) -> None:
    """Seed devices and historical timeline from Teammate 1's data generator."""
    device_count = db.query(Device).count()

    # ----- Try to import Teammate 1's data generator -----
    try:
        from backend.app.simulation.data_generator import (  # type: ignore
            build_profiles,
            load_dataset,
            DEFAULT_OUTPUT_PATH,
        )

        profiles = build_profiles()

        if device_count == 0:
            logger.info(f"Seeding {len(profiles)} devices from ML data generator…")
            seed_devices(db, [p.to_dict() for p in profiles])

        # Seed timeline events if not yet populated
        timeline_count = db.query(TimelineEvent).count()
        if timeline_count == 0 and DEFAULT_OUTPUT_PATH.exists():
            logger.info("Seeding historical timeline from synthetic_network_logs.json…")
            dataset = load_dataset(DEFAULT_OUTPUT_PATH)
            _seed_timeline_from_records(db, dataset.get("records", []))

    except ImportError:
        logger.info("Teammate 1 data generator not found — using static device seed.")
        if device_count == 0:
            _seed_static_devices(db)


def _seed_timeline_from_records(db, records: list, batch_size: int = 500) -> None:
    """Convert raw telemetry records from the data generator into timeline events."""
    events = []
    for r in records:
        ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
        events.append(TimelineEvent(
            device_id=r["source_ip"],
            timestamp=ts,
            bytes_sent=float(r.get("bytes_sent", 0)),
            bytes_received=float(r.get("bytes_received", 0)),
            connections=float(r.get("connection_count", 0)),
            unique_destinations=float(r.get("unique_destinations", 0)),
            failed_connections=float(r.get("failed_connections", 0)),
            dns_requests=float(r.get("dns_requests", 0)),
            risk_score=0.0,
            is_anomaly=False,
            activity_hour=ts.hour,
        ))
        if len(events) >= batch_size:
            db.bulk_save_objects(events)
            db.commit()
            events = []
    if events:
        db.bulk_save_objects(events)
        db.commit()
    logger.info("Timeline seeding complete.")


def _seed_static_devices(db) -> None:
    """
    Minimal static seed of the 42 devices using the profile roster defined by
    Teammate 1 - used when the ML package is not installed.
    """
    # Import the roster directly from data_generator; if unavailable use a
    # minimal hard-coded subset so the API is always functional.
    try:
        from backend.app.simulation.data_generator import ROSTER, TEMPLATES, HERO_PROFILE, HERO_DEVICE_ID  # type: ignore
        import random
        import hashlib

        def _mac(ip: str) -> str:
            h = hashlib.md5(f"mac:{ip}".encode()).hexdigest()
            return "00:1B:44:" + ":".join(h[i:i+2].upper() for i in (0, 2, 4))

        profiles = []
        SEED = 42
        for ip, name, dtype, tmpl in ROSTER:
            t = TEMPLATES[tmpl]
            rng = random.Random(f"{SEED}:{ip}")
            if ip == HERO_DEVICE_ID:
                vals = dict(HERO_PROFILE)
            else:
                vals = {
                    "sent": int(rng.uniform(*t["sent"])),
                    "recv": int(rng.uniform(*t["recv"])),
                    "conn": max(1, round(rng.uniform(*t["conn"]))),
                    "uniq": max(1, round(rng.uniform(*t["uniq"]))),
                    "failed": float(round(rng.uniform(*t["failed"]))),
                    "dns": max(1, round(rng.uniform(*t["dns"]))),
                    "mac": _mac(ip),
                    "hours": t["hours"],
                }
            profiles.append({
                "id": ip, "name": name, "type": dtype, "ip": ip,
                "mac": vals.get("mac", _mac(ip)),
                "avg_bytes_sent": float(vals["sent"]),
                "avg_bytes_received": float(vals["recv"]),
                "avg_connections": float(vals["conn"]),
                "avg_unique_destinations": float(vals["uniq"]),
                "avg_failed_connections": float(vals["failed"]),
                "avg_dns_requests": float(vals["dns"]),
                "active_hours_start": vals["hours"][0],
                "active_hours_end": vals["hours"][1],
            })
        seed_devices(db, profiles)
        logger.info(f"Static seeded {len(profiles)} devices.")
    except ImportError:
        logger.info("Data generator module not found — generating full 42-device baseline roster.")
        profiles = []
        # 1. Hero Device
        profiles.append({
            "id": "192.168.1.23",
            "name": "Student-Laptop",
            "type": "Workstation",
            "ip": "192.168.1.23",
            "mac": "00:1B:44:11:3A:B7",
            "avg_bytes_sent": 25600.0,
            "avg_bytes_received": 102400.0,
            "avg_connections": 32.0,
            "avg_unique_destinations": 5.0,
            "avg_failed_connections": 2.0,
            "avg_dns_requests": 18.0,
            "active_hours_start": 8,
            "active_hours_end": 22,
        })
        # 2. Other Workstations (19 devices)
        for i in range(10, 30):
            if i == 23:
                continue
            ip = f"192.168.1.{i}"
            profiles.append({
                "id": ip,
                "name": f"Workstation-{i:02d}",
                "type": "Workstation",
                "ip": ip,
                "mac": f"00:1B:44:01:{i:02X}:AA",
                "avg_bytes_sent": 30000.0 + (i * 120),
                "avg_bytes_received": 120000.0 + (i * 450),
                "avg_connections": 35.0,
                "avg_unique_destinations": 8.0,
                "avg_failed_connections": 1.0,
                "avg_dns_requests": 20.0,
                "active_hours_start": 8,
                "active_hours_end": 19,
            })
        # 3. Servers (6 devices)
        server_names = ["DNS-Primary", "File-Server", "Mail-Relay", "Web-Internal", "Backup-Vault", "Auth-Directory"]
        for idx, sname in enumerate(server_names):
            ip = f"192.168.1.{50 + idx}"
            profiles.append({
                "id": ip,
                "name": sname,
                "type": "Server",
                "ip": ip,
                "mac": f"00:1B:44:50:{idx:02X}:10",
                "avg_bytes_sent": 250000.0,
                "avg_bytes_received": 350000.0,
                "avg_connections": 120.0,
                "avg_unique_destinations": 35.0,
                "avg_failed_connections": 0.5,
                "avg_dns_requests": 60.0,
                "active_hours_start": 0,
                "active_hours_end": 24,
            })
        # 4. Printers (6 devices)
        for idx in range(6):
            ip = f"192.168.1.{70 + idx}"
            profiles.append({
                "id": ip,
                "name": f"Floor-Printer-{idx + 1}",
                "type": "Printer",
                "ip": ip,
                "mac": f"00:1B:44:70:{idx:02X}:22",
                "avg_bytes_sent": 8000.0,
                "avg_bytes_received": 45000.0,
                "avg_connections": 10.0,
                "avg_unique_destinations": 4.0,
                "avg_failed_connections": 0.0,
                "avg_dns_requests": 5.0,
                "active_hours_start": 7,
                "active_hours_end": 20,
            })
        # 5. IoT & Security (10 devices -> total exactly 42)
        iot_names = [
            "Camera-Lobby", "Camera-Parking", "Thermostat-East", "Thermostat-West",
            "Smart-Display-1", "Smart-Display-2", "Access-Badge-Reader",
            "Environment-Sensor", "Smart-Plug-ServerRoom", "Conference-VoIP"
        ]
        for idx, iname in enumerate(iot_names):
            ip = f"192.168.1.{100 + idx}"
            profiles.append({
                "id": ip,
                "name": iname,
                "type": "IoT",
                "ip": ip,
                "mac": f"00:1B:44:A0:{idx:02X}:99",
                "avg_bytes_sent": 3500.0,
                "avg_bytes_received": 4200.0,
                "avg_connections": 4.0,
                "avg_unique_destinations": 2.0,
                "avg_failed_connections": 0.0,
                "avg_dns_requests": 3.0,
                "active_hours_start": 0,
                "active_hours_end": 24,
            })
        seed_devices(db, profiles)
        logger.info(f"Fallback seeded {len(profiles)} baseline devices.")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Network Anomaly Spotter API",
    description=(
        "Behavioral anomaly detection and investigation assistance platform. "
        "Detects unusual network behavior, explains why it is suspicious, "
        "and provides prioritized investigation guidance."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server (port 5173) and any localhost origin
FRONTEND_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS + ["*"],  # permissive for hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


# Root redirect to docs
@app.get("/", include_in_schema=False)
def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
