"""Health endpoint - Teammate 2 (Backend/Platform)."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.schemas import HealthResponse
from backend.app.services.database import get_db
from backend.app.simulation import state_manager

router = APIRouter()

_START_TIME = time.monotonic()


@router.get("/health", response_model=HealthResponse, summary="Health check")
def health_check(db: Session = Depends(get_db)):
    """Returns API health status, database connectivity, and uptime."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    return HealthResponse(
        status="ok",
        version="1.0.0",
        database=db_status,
        uptime_seconds=round(time.monotonic() - _START_TIME, 2),
        simulation_active=state_manager.is_active(),
    )
