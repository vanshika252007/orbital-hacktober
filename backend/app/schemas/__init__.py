"""
Pydantic v2 schemas for Network Anomaly Spotter - Teammate 2 (Backend/Platform).

These schemas define the API request/response shapes and map directly
to the shared contracts in shared/contracts/*.json.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class DeviceStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class Confidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ---------------------------------------------------------------------------
# Signal schema (anomaly_schema.json signals[])
# ---------------------------------------------------------------------------

class SignalSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str
    severity: Severity
    measured_value: float
    baseline_value: float
    deviation_factor: float
    explanation: str


# ---------------------------------------------------------------------------
# Device baseline / current metrics
# ---------------------------------------------------------------------------

class DeviceBaseline(BaseModel):
    avg_bytes_sent: float
    avg_bytes_received: float
    avg_connections: float
    avg_unique_destinations: float
    avg_failed_connections: float
    avg_dns_requests: float
    active_hours_start: int = Field(ge=0, le=23)
    active_hours_end: int = Field(ge=0, le=24)


class CurrentMetrics(BaseModel):
    bytes_sent: float
    bytes_received: float
    connections: float
    unique_destinations: float
    failed_connections: float
    dns_requests: float
    activity_hour: int = Field(ge=0, le=23)


# ---------------------------------------------------------------------------
# Device schema (device_schema.json)
# ---------------------------------------------------------------------------

class DeviceSchema(BaseModel):
    id: str
    name: str
    type: str
    ip: str
    mac: str
    status: DeviceStatus
    risk_score: float = Field(ge=0, le=100)
    last_seen: Optional[datetime] = None
    baseline: DeviceBaseline
    current_metrics: Optional[CurrentMetrics] = None


class DeviceListItem(BaseModel):
    """Lightweight device item for the device list endpoint."""
    id: str
    name: str
    type: str
    ip: str
    mac: str
    status: DeviceStatus
    risk_score: float
    last_seen: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Timeline entry
# ---------------------------------------------------------------------------

class TimelineEntry(BaseModel):
    timestamp: datetime
    bytes_sent: float
    bytes_received: float
    connections: float
    unique_destinations: float
    failed_connections: float
    dns_requests: float
    risk_score: float
    is_anomaly: bool
    activity_hour: int


# ---------------------------------------------------------------------------
# Alert schema (alert_schema.json)
# ---------------------------------------------------------------------------

class AlertSchema(BaseModel):
    id: str
    device_id: str
    device_name: str
    risk_score: float = Field(ge=0, le=100)
    severity: Severity
    status: AlertStatus
    detected_at: datetime
    primary_reason: str
    signals_count: int
    signals: List[SignalSchema] = Field(default_factory=list)


class AlertListItem(BaseModel):
    """Lightweight alert for the list endpoint."""
    id: str
    device_id: str
    device_name: str
    risk_score: float
    severity: Severity
    status: AlertStatus
    detected_at: datetime
    primary_reason: str
    signals_count: int


# ---------------------------------------------------------------------------
# Anomaly schema (anomaly_schema.json)
# ---------------------------------------------------------------------------

class AnomalySchema(BaseModel):
    id: str
    device_id: str
    anomaly: bool
    risk_score: float
    severity: Severity
    detected_at: datetime
    signals: List[SignalSchema] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Investigation schema (investigation_schema.json)
# ---------------------------------------------------------------------------

class CheckFirstItem(BaseModel):
    priority: int
    action: str
    reason: str


class InvestigationSchema(BaseModel):
    alert_id: str
    device_id: str
    summary: str
    observed_evidence: List[str]
    possible_explanations: List[str]
    check_first: List[CheckFirstItem]
    next_steps: List[str]
    confidence: Confidence
    generated_by: str


# ---------------------------------------------------------------------------
# Simulation schemas
# ---------------------------------------------------------------------------

class SimulationStartResponse(BaseModel):
    status: str
    message: str
    alert_id: Optional[str] = None
    device_id: Optional[str] = None


class SimulationResetResponse(BaseModel):
    status: str
    message: str


# ---------------------------------------------------------------------------
# Stats schema
# ---------------------------------------------------------------------------

class NetworkStats(BaseModel):
    total_devices: int
    active_anomalies: int
    critical_count: int
    total_events: int
    network_health: str  # "HEALTHY" | "DEGRADED" | "CRITICAL"


# ---------------------------------------------------------------------------
# Health schema
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    uptime_seconds: float
    simulation_active: bool
