# Network Anomaly Spotter — Frontend Platform

> **Teammate 3 Deliverables: SOC Dashboard, Visualizations, Connected Topology & AI Investigation Workspace**

Network Anomaly Spotter detects unusual network behavior before it becomes an obvious security incident, explains why it is suspicious, and provides small IT teams with prioritized investigation guidance.

---

## 1. Architecture & Stack

- **Core**: React 19 + Vite 8
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Curated Cybersecurity SOC Design Tokens
- **Icons**: Lucide React
- **Charting**: Recharts
- **Integration**: FastAPI Backend (Port 8000) with automatic zero-fail demo fallback

---

## 2. Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v20)
- npm or bun

### Installation
```bash
cd frontend
npm install
```

### Running Locally (Development)
```bash
npm run dev
```
The application will launch on `http://localhost:5173`. API calls to `/api` are automatically proxied to the backend at `http://localhost:8000`.

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 3. The 5 Core Application Pages

1. **Network Overview (`overview`)**:
   - Executive header: *"See what shouldn't be happening."*
   - 4 KPI cards: Total Devices (42), Active Anomalies, Critical Incidents, Events Processed.
   - **Signature Connected Topology Visualization**: Orbital concentric geometric nodes with delicate bezier paths, gateway center, and real-time anomaly glow highlighting suspicious endpoints.
   - **Aggregate Traffic Telemetry Chart**: Recharts area chart with dual-axis byte trends and anomaly window markers.
   - **Subnet Risk Tier Distribution**: Horizontal distribution chart mapping nodes by risk category.
   - **Priority Investigation Queue**: Active incident queue ranked by ML risk score with direct CTA to launch the investigation workspace.

2. **Monitored Devices Inventory (`devices`)**:
   - Search by hostname, IP address, hardware MAC.
   - Filter by severity (Critical, Warning, Healthy) and role (Workstation, Server, IoT, Mobile).
   - Sort by risk index, hostname, or IP.
   - Row-level inspection to deep dive into device metrics.

3. **Security Alerts Feed (`alerts`)**:
   - Filterable, searchable SOC alert triage feed.
   - Complete signal breakdown with mathematically verified deviation multipliers.
   - Direct routing to device inspection and investigation workspace.

4. **Device Details & Telemetry (`device-detail`)**:
   - Side-by-side **Baseline vs. Current Behavioral Metrics** with mathematical ratio derivation (e.g. 86.0x outbound spike).
   - 24-hour time-series area chart tracking outbound and inbound traffic.
   - Hardware metadata and operating schedule compliance tracking.

5. **AI Investigation Workspace (`investigation`)**:
   - SOC-grade investigation workspace with confidence score and model attribution.
   - **Observed Telemetry Evidence**: Verified signals and deviations.
   - **Root Cause Hypotheses**: Hypotheses clearly labeled as potential explanations (reconnaissance, data staging, malware C2, automated script).
   - **Prioritized Checklist ("What Should I Check First?")**: Interactive numbered checklist with priority badges (1 to 5) and evidence availability tags.
   - **Host Containment Action**: Interactive VLAN / switch isolation simulation.

---

## 4. Design Vision & Tokens

- **App background**: `#080B0D`
- **Sidebar background**: `#0C1210`
- **Card background**: `#111816`
- **Elevated surface**: `#17211C`
- **Border**: `#283932`
- **Primary text**: `#F0F5F2`
- **Muted text**: `#96AAA0`
- **Primary accent**: `#B5F2D5` (mint)
- **Secondary accent**: `#8FE3E8` (cyan)
- **Healthy status**: `#42D6A0`
- **Warning status**: `#F4BD50`
- **Critical status**: `#FF657A`
