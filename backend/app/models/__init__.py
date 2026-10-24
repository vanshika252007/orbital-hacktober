"""
SQLAlchemy ORM models for Network Anomaly Spotter - Teammate 2 (Backend/Platform).

Uses SQLite via SQLAlchemy 2.x declarative style.
Tables: Device, Alert, Anomaly, Investigation, TimelineEvent.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Device model
# ---------------------------------------------------------------------------

class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True)          # IP address
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    ip = Column(String, nullable=False)
    mac = Column(String, nullable=False)
    status = Column(String, nullable=False, default="healthy")
    risk_score = Column(Float, nullable=False, default=0.0)
    last_seen = Column(DateTime(timezone=True), nullable=True)

    # Baseline metrics (JSON-serialised for portability)
    avg_bytes_sent = Column(Float, nullable=False, default=0.0)
    avg_bytes_received = Column(Float, nullable=False, default=0.0)
    avg_connections = Column(Float, nullable=False, default=0.0)
    avg_unique_destinations = Column(Float, nullable=False, default=0.0)
    avg_failed_connections = Column(Float, nullable=False, default=0.0)
    avg_dns_requests = Column(Float, nullable=False, default=0.0)
    active_hours_start = Column(Integer, nullable=False, default=8)
    active_hours_end = Column(Integer, nullable=False, default=22)

    # Current live metrics (updated during simulation)
    cur_bytes_sent = Column(Float, nullable=True)
    cur_bytes_received = Column(Float, nullable=True)
    cur_connections = Column(Float, nullable=True)
    cur_unique_destinations = Column(Float, nullable=True)
    cur_failed_connections = Column(Float, nullable=True)
    cur_dns_requests = Column(Float, nullable=True)
    cur_activity_hour = Column(Integer, nullable=True)

    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="device", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="device", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Alert model
# ---------------------------------------------------------------------------

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    device_name = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False, default="OPEN")
    detected_at = Column(DateTime(timezone=True), nullable=False)
    primary_reason = Column(Text, nullable=False)
    signals_count = Column(Integer, nullable=False, default=0)
    signals_json = Column(Text, nullable=False, default="[]")  # JSON list of signals

    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    device = relationship("Device", back_populates="alerts")
    investigation = relationship("Investigation", back_populates="alert", uselist=False, cascade="all, delete-orphan")

    @property
    def signals(self) -> list:
        return json.loads(self.signals_json)

    @signals.setter
    def signals(self, value: list) -> None:
        self.signals_json = json.dumps(value)


# ---------------------------------------------------------------------------
# Anomaly model
# ---------------------------------------------------------------------------

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    anomaly = Column(Boolean, nullable=False, default=True)
    risk_score = Column(Float, nullable=False)
    severity = Column(String, nullable=False)
    detected_at = Column(DateTime(timezone=True), nullable=False)
    signals_json = Column(Text, nullable=False, default="[]")

    device = relationship("Device", back_populates="anomalies")

    @property
    def signals(self) -> list:
        return json.loads(self.signals_json)

    @signals.setter
    def signals(self, value: list) -> None:
        self.signals_json = json.dumps(value)


# ---------------------------------------------------------------------------
# Investigation model
# ---------------------------------------------------------------------------

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String, primary_key=True)
    alert_id = Column(String, ForeignKey("alerts.id"), nullable=False)
    device_id = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    observed_evidence_json = Column(Text, nullable=False, default="[]")
    possible_explanations_json = Column(Text, nullable=False, default="[]")
    check_first_json = Column(Text, nullable=False, default="[]")
    next_steps_json = Column(Text, nullable=False, default="[]")
    confidence = Column(String, nullable=False, default="medium")
    generated_by = Column(String, nullable=False, default="deterministic_fallback")
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    alert = relationship("Alert", back_populates="investigation")

    @property
    def observed_evidence(self) -> list:
        return json.loads(self.observed_evidence_json)

    @observed_evidence.setter
    def observed_evidence(self, value: list) -> None:
        self.observed_evidence_json = json.dumps(value)

    @property
    def possible_explanations(self) -> list:
        return json.loads(self.possible_explanations_json)

    @possible_explanations.setter
    def possible_explanations(self, value: list) -> None:
        self.possible_explanations_json = json.dumps(value)

    @property
    def check_first(self) -> list:
        return json.loads(self.check_first_json)

    @check_first.setter
    def check_first(self, value: list) -> None:
        self.check_first_json = json.dumps(value)

    @property
    def next_steps(self) -> list:
        return json.loads(self.next_steps_json)

    @next_steps.setter
    def next_steps(self, value: list) -> None:
        self.next_steps_json = json.dumps(value)


# ---------------------------------------------------------------------------
# Timeline event model
# ---------------------------------------------------------------------------

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    bytes_sent = Column(Float, nullable=False, default=0.0)
    bytes_received = Column(Float, nullable=False, default=0.0)
    connections = Column(Float, nullable=False, default=0.0)
    unique_destinations = Column(Float, nullable=False, default=0.0)
    failed_connections = Column(Float, nullable=False, default=0.0)
    dns_requests = Column(Float, nullable=False, default=0.0)
    risk_score = Column(Float, nullable=False, default=0.0)
    is_anomaly = Column(Boolean, nullable=False, default=False)
    activity_hour = Column(Integer, nullable=False, default=0)

    device = relationship("Device", back_populates="timeline_events")
