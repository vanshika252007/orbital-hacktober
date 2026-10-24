# Network Anomaly Spotter — Backend & Platform

> **Teammate 2 Deliverables: Backend API, Database, Simulation State Engine & Team Contracts**

Network Anomaly Spotter detects unusual network behavior before it becomes an obvious security incident, explains why it is suspicious, and provides small IT teams with prioritized investigation guidance.

---

## 1. Architecture Overview

Teammate 2 provides the core platform and central integration hub for all four teammates:

```
                      +-----------------------------+
                      |   Teammate 3: Frontend UI   |
                      |   (Vite / React Dashboard)  |
                      +--------------+--------------+
                                     | HTTP / REST
                                     v
                      +-----------------------------+
                      | Teammate 2: FastAPI Backend |
                      |    (Port 8000 / SQLite DB)  |
                      +---+---------------------+---+
                          |                     |
     Imports & Fallback   |                     | Imports & Fallback
                          v                     v
         +------------------------+   +-----------------------------+
         | Teammate 1: ML Engine  |   | Teammate 4: Investigation   |
         | - Synthetic Generator  |   | - Gemini 2.5 Flash /        |
         | - Baselines & Rules    |   |   Deterministic Fallback    |
         | - Risk Scoring Engine  |   | - Root Cause & Next Steps   |
         +------------------------+   +-----------------------------+
```

---

## 2. Quickstart

### Prerequisites
- Python 3.10+
- SQLite3 (included with Python standard library)

### Installation
```bash
# Clone or navigate to the repository
cd "network backend"

# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Running the API Server
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

- Interactive OpenAPI Swagger Docs: `http://localhost:8000/docs`
- Alternative ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/api/health`

---

## 3. The 30-Second Demo Presentation Scenario

The platform supports a 100% deterministic, zero-fail demo sequence:

1. **Scene 1 (Clean State):** Dashboard queries `GET /api/stats` and `GET /api/devices`. All 42 devices are healthy, risk scores are 0, network health displays **HEALTHY** (`MONITORING`).
2. **Scene 2 (Trigger Anomaly):** Judge or presenter clicks "Simulate Attack" / "Trigger Anomaly" -> calls `POST /api/simulation/start`.
3. **Scene 3 (Instant Detection):** 
   - The ML rule engine evaluates the hero anomaly window for `Student-Laptop` (`192.168.1.23`) at `03:17 AM`.
   - Computes risk score **94 / CRITICAL**.
   - Outbound traffic: 2.1 MB (8.2x baseline of 25 KB).
   - Failed connections: 340 (170x baseline of 2).
   - Unique destinations: 47 (9.4x baseline of 5).
   - Off-hours activity (outside 08:00–22:00 window).
4. **Scene 4 (Dashboard Alert):**
   - Device status updates to `critical`.
   - `GET /api/alerts` returns `alert_hero_001`.
   - Network health degrades to **CRITICAL**.
5. **Scene 5 (Investigate):**
   - Clicking the alert calls `GET /api/investigations/alert_hero_001`.
   - Returns structured evidence, ranked `check_first` checklist (5 clear, actionable steps), and containment advice.
6. **Scene 6 (Reset):**
   - Clicking "Reset Demo" calls `POST /api/simulation/reset`.
   - Clears alerts, removes anomaly flags, and restores all 42 devices to baseline.

---

## 4. API Endpoints Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, DB connectivity, uptime, simulation state |
| `GET` | `/api/stats` | High-level KPI counters (`total_devices`, `active_anomalies`, `critical_count`, `network_health`) |
| `GET` | `/api/devices` | List monitored devices (sorted with critical / high-risk first) |
| `GET` | `/api/devices/{id}` | Detailed device view including current metrics and 30-day baseline |
| `GET` | `/api/devices/{id}/timeline` | Time-series metrics for charting (bytes sent/received, connection rates, anomalies) |
| `GET` | `/api/alerts` | List all security alerts, filtered by severity or status |
| `GET` | `/api/alerts/{id}` | Retrieve specific alert details and triggering signals |
| `GET` | `/api/anomalies` | Raw anomaly records output by the ML engine |
| `POST` | `/api/simulation/start` | Trigger deterministic hero anomaly demo sequence |
| `POST` | `/api/simulation/reset` | Reset simulation to clean baseline state |
| `GET` | `/api/investigations/{alert_id}` | Retrieve cached investigation assistance report |
| `POST` | `/api/investigations/{alert_id}/generate` | Force regeneration of investigation report via Teammate 4's engine |

---

## 5. Team Integration & Shared Contracts

Shared JSON schemas and mock fixtures reside under `shared/`:

- `shared/contracts/device_schema.json`
- `shared/contracts/alert_schema.json`
- `shared/contracts/anomaly_schema.json`
- `shared/contracts/investigation_schema.json`
- `shared/fixtures/health.json`
- `shared/fixtures/stats_clean.json`
- `shared/fixtures/stats_simulation.json`
- `shared/fixtures/devices.json`
- `shared/fixtures/device_detail.json`
- `shared/fixtures/alerts.json`
- `shared/fixtures/investigation.json`
- `shared/fixtures/timeline.json`

### Graceful Fallbacks
If Teammate 1 (ML) or Teammate 4 (Gemini Investigation) modules are not present in the runtime environment:
- **ML Fallback:** Built-in heuristic rule evaluation and risk engine calculation guarantee identical deterministic outputs for `Student-Laptop`.
- **Investigation Fallback:** A fully structured, SOC-grade deterministic fallback produces `check_first` actions and root cause hypothesis even if Gemini API keys are absent or network requests time out.

---

## 6. Running Tests

Run the complete backend test suite:
```bash
pytest tests/ -v
```

All 36 unit and integration tests validate:
- Health and stats endpoints
- Device listing and baseline schema
- Alert creation and retrieval
- Full simulation lifecycle (`start` -> state change -> `reset` -> clean state)
- Investigation schema validation and error handling
