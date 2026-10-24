"""Simulation endpoints - Teammate 2 (Backend/Platform)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.schemas import SimulationStartResponse, SimulationResetResponse
from backend.app.services.database import get_db
from backend.app.simulation import state_manager

router = APIRouter()


@router.post(
    "/simulation/start",
    response_model=SimulationStartResponse,
    summary="Trigger hero anomaly demo",
)
def start_simulation(db: Session = Depends(get_db)):
    """
    Activates the deterministic hero anomaly simulation for Student-Laptop (192.168.1.23).

    This triggers the 30-second presentation scenario described in Section 6:
    - Generates risk score 94 / CRITICAL alert
    - Sets device live metrics to the anomalous values (8.2x traffic, 430 connections, etc.)
    - Pre-generates investigation guidance
    - Dashboard transitions from HEALTHY → CRITICAL

    Calling this endpoint multiple times is safe (idempotent guard).
    Call /api/simulation/reset to return to clean state.
    """
    result = state_manager.start_simulation(db)
    return SimulationStartResponse(**result)


@router.post(
    "/simulation/reset",
    response_model=SimulationResetResponse,
    summary="Reset simulation to clean state",
)
def reset_simulation(db: Session = Depends(get_db)):
    """
    Resets all devices to clean baseline (Scene 7 of demo workflow).
    - Removes all alerts and anomaly records
    - Clears device live metrics
    - Network health returns to MONITORING / HEALTHY
    """
    result = state_manager.reset_simulation(db)
    return SimulationResetResponse(**result)
