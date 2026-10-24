"""
API Router - Teammate 2 (Backend/Platform).

Assembles all endpoint routers under /api prefix.
"""
from fastapi import APIRouter

from backend.app.api.endpoints import (
    health,
    devices,
    alerts,
    anomalies,
    simulation,
    investigations,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(devices.router, tags=["Devices"])
api_router.include_router(alerts.router, tags=["Alerts"])
api_router.include_router(anomalies.router, tags=["Anomalies"])
api_router.include_router(simulation.router, tags=["Simulation"])
api_router.include_router(investigations.router, tags=["Investigations"])
