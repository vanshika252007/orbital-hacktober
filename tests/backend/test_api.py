"""
Backend API tests - Teammate 2 (Backend/Platform).

Tests all FastAPI endpoints using TestClient with an in-memory SQLite database.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.models import Base, Device
from backend.app.services.database import get_db


# ---------------------------------------------------------------------------
# Test database setup (in-memory SQLite, isolated per test)
# ---------------------------------------------------------------------------

from sqlalchemy.pool import StaticPool

TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# Seed a minimal test device before tests run
Base.metadata.create_all(bind=engine)
_db = TestingSessionLocal()
_hero = Device(
    id="192.168.1.23",
    name="Student-Laptop",
    type="Workstation",
    ip="192.168.1.23",
    mac="00:1B:44:11:3A:B7",
    status="healthy",
    risk_score=0.0,
    avg_bytes_sent=25600.0,
    avg_bytes_received=102400.0,
    avg_connections=32.0,
    avg_unique_destinations=5.0,
    avg_failed_connections=2.0,
    avg_dns_requests=18.0,
    active_hours_start=8,
    active_hours_end=22,
)
_db.add(_hero)
_db.commit()
_db.close()

client = TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_returns_200(self):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_response_schema(self):
        data = client.get("/api/health").json()
        assert "status" in data
        assert "version" in data
        assert "database" in data
        assert "uptime_seconds" in data
        assert "simulation_active" in data

    def test_health_status_ok(self):
        data = client.get("/api/health").json()
        assert data["status"] == "ok"

    def test_health_database_ok(self):
        data = client.get("/api/health").json()
        assert data["database"] == "ok"


# ---------------------------------------------------------------------------
# Stats endpoint
# ---------------------------------------------------------------------------

class TestStatsEndpoint:
    def test_stats_returns_200(self):
        response = client.get("/api/stats")
        assert response.status_code == 200

    def test_stats_schema(self):
        data = client.get("/api/stats").json()
        assert "total_devices" in data
        assert "active_anomalies" in data
        assert "critical_count" in data
        assert "total_events" in data
        assert "network_health" in data

    def test_stats_initial_healthy(self):
        data = client.get("/api/stats").json()
        assert data["network_health"] == "HEALTHY"
        assert data["active_anomalies"] == 0
        assert data["critical_count"] == 0

    def test_stats_total_devices_positive(self):
        data = client.get("/api/stats").json()
        assert data["total_devices"] >= 1


# ---------------------------------------------------------------------------
# Devices endpoints
# ---------------------------------------------------------------------------

class TestDevicesEndpoints:
    def test_list_devices_returns_200(self):
        response = client.get("/api/devices")
        assert response.status_code == 200

    def test_list_devices_is_list(self):
        data = client.get("/api/devices").json()
        assert isinstance(data, list)

    def test_list_devices_item_schema(self):
        data = client.get("/api/devices").json()
        assert len(data) >= 1
        device = data[0]
        assert "id" in device
        assert "name" in device
        assert "ip" in device
        assert "status" in device
        assert "risk_score" in device

    def test_get_device_hero(self):
        response = client.get("/api/devices/192.168.1.23")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "192.168.1.23"
        assert data["name"] == "Student-Laptop"

    def test_get_device_has_baseline(self):
        data = client.get("/api/devices/192.168.1.23").json()
        baseline = data["baseline"]
        assert baseline["avg_bytes_sent"] == 25600.0
        assert baseline["avg_connections"] == 32.0
        assert baseline["active_hours_start"] == 8
        assert baseline["active_hours_end"] == 22

    def test_get_device_not_found(self):
        response = client.get("/api/devices/999.999.999.999")
        assert response.status_code == 404

    def test_device_timeline_returns_list(self):
        response = client.get("/api/devices/192.168.1.23/timeline")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_device_timeline_not_found(self):
        response = client.get("/api/devices/0.0.0.0/timeline")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Alerts endpoints
# ---------------------------------------------------------------------------

class TestAlertsEndpoints:
    def test_list_alerts_returns_200(self):
        response = client.get("/api/alerts")
        assert response.status_code == 200

    def test_list_alerts_is_list(self):
        assert isinstance(client.get("/api/alerts").json(), list)

    def test_get_alert_not_found(self):
        response = client.get("/api/alerts/nonexistent_alert")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Anomalies endpoint
# ---------------------------------------------------------------------------

class TestAnomaliesEndpoint:
    def test_list_anomalies_returns_200(self):
        response = client.get("/api/anomalies")
        assert response.status_code == 200

    def test_list_anomalies_is_list(self):
        assert isinstance(client.get("/api/anomalies").json(), list)


# ---------------------------------------------------------------------------
# Simulation lifecycle
# ---------------------------------------------------------------------------

class TestSimulationLifecycle:
    def test_simulation_start_returns_200(self):
        response = client.post("/api/simulation/start")
        assert response.status_code == 200

    def test_simulation_start_schema(self):
        data = client.post("/api/simulation/start").json()
        assert "status" in data
        assert "message" in data

    def test_simulation_creates_alert(self):
        client.post("/api/simulation/start")
        alerts = client.get("/api/alerts").json()
        assert len(alerts) >= 1

    def test_simulation_alert_is_critical(self):
        client.post("/api/simulation/start")
        alerts = client.get("/api/alerts").json()
        critical = [a for a in alerts if a["severity"] == "CRITICAL"]
        assert len(critical) >= 1

    def test_simulation_stats_degrade(self):
        client.post("/api/simulation/start")
        data = client.get("/api/stats").json()
        assert data["active_anomalies"] >= 1
        assert data["network_health"] != "HEALTHY"

    def test_simulation_device_metrics_updated(self):
        client.post("/api/simulation/start")
        data = client.get("/api/devices/192.168.1.23").json()
        assert data["status"] == "critical"
        assert data["risk_score"] == 94.0

    def test_simulation_reset_returns_200(self):
        client.post("/api/simulation/start")
        response = client.post("/api/simulation/reset")
        assert response.status_code == 200

    def test_simulation_reset_clears_alerts(self):
        client.post("/api/simulation/start")
        client.post("/api/simulation/reset")
        alerts = client.get("/api/alerts").json()
        assert len(alerts) == 0

    def test_simulation_reset_restores_device(self):
        client.post("/api/simulation/start")
        client.post("/api/simulation/reset")
        data = client.get("/api/devices/192.168.1.23").json()
        assert data["status"] == "healthy"
        assert data["risk_score"] == 0.0

    def test_simulation_reset_stats_healthy(self):
        client.post("/api/simulation/start")
        client.post("/api/simulation/reset")
        data = client.get("/api/stats").json()
        assert data["network_health"] == "HEALTHY"
        assert data["active_anomalies"] == 0


# ---------------------------------------------------------------------------
# Investigations endpoint
# ---------------------------------------------------------------------------

class TestInvestigationsEndpoints:
    def test_get_investigation_after_simulation(self):
        client.post("/api/simulation/start")
        response = client.get("/api/investigations/alert_hero_001")
        assert response.status_code == 200

    def test_investigation_schema(self):
        client.post("/api/simulation/start")
        data = client.get("/api/investigations/alert_hero_001").json()
        assert "alert_id" in data
        assert "device_id" in data
        assert "summary" in data
        assert "observed_evidence" in data
        assert "possible_explanations" in data
        assert "check_first" in data
        assert "next_steps" in data
        assert "confidence" in data
        assert "generated_by" in data

    def test_investigation_check_first_structure(self):
        client.post("/api/simulation/start")
        data = client.get("/api/investigations/alert_hero_001").json()
        for item in data["check_first"]:
            assert "priority" in item
            assert "action" in item
            assert "reason" in item
            assert isinstance(item["priority"], int)

    def test_investigation_not_found_for_unknown_alert(self):
        response = client.get("/api/investigations/nonexistent_alert")
        assert response.status_code == 404

    def test_investigation_generate_endpoint(self):
        client.post("/api/simulation/start")
        response = client.post("/api/investigations/alert_hero_001/generate")
        assert response.status_code == 200
        data = response.json()
        assert data["alert_id"] == "alert_hero_001"
