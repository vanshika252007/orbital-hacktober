import {
  NetworkStats,
  Alert,
  Investigation,
  Device,
  DeviceListItem,
  TimelineEntry
} from '../types';

export const MOCK_STATS_CLEAN: NetworkStats = {
  total_devices: 42,
  active_anomalies: 0,
  critical_count: 0,
  total_events: 7056,
  network_health: "HEALTHY",
};

export const MOCK_STATS_SIMULATION: NetworkStats = {
  total_devices: 42,
  active_anomalies: 1,
  critical_count: 1,
  total_events: 7057,
  network_health: "CRITICAL",
};

export const MOCK_HERO_ALERT: Alert = {
  id: "alert_hero_001",
  device_id: "192.168.1.23",
  device_name: "Student-Laptop",
  risk_score: 94.0,
  severity: "CRITICAL",
  status: "OPEN",
  detected_at: "2026-10-24T03:17:00Z",
  primary_reason: "Outbound traffic 86.0x baseline (2.1 MB vs 25 KB), 340 failed connections, 47 unique destinations at 03:17 AM (outside normal 08:00-22:00 window)",
  signals_count: 4,
  signals: [
    {
      type: "traffic_spike",
      severity: "HIGH",
      measured_value: 2202010.0,
      baseline_value: 25600.0,
      deviation_factor: 86.0,
      explanation: "Outbound traffic is 86.0x above baseline (2.1 MB vs 25 KB normal)"
    },
    {
      type: "failed_connection_burst",
      severity: "CRITICAL",
      measured_value: 340.0,
      baseline_value: 2.0,
      deviation_factor: 170.0,
      explanation: "340 failed connection attempts vs 2 normal (170.0x baseline)"
    },
    {
      type: "destination_explosion",
      severity: "HIGH",
      measured_value: 47.0,
      baseline_value: 5.0,
      deviation_factor: 9.4,
      explanation: "Contacted 47 unique destinations vs 5 normal (9.4x baseline)"
    },
    {
      type: "unusual_hours",
      severity: "HIGH",
      measured_value: 3.0,
      baseline_value: 8.0,
      deviation_factor: 5.0,
      explanation: "Activity at 03:17 is outside this device's normal active hours (08:00-22:00)"
    }
  ]
};

export const MOCK_INVESTIGATION: Investigation = {
  alert_id: "alert_hero_001",
  device_id: "192.168.1.23",
  summary: "Behavioral anomaly observed on Student-Laptop (192.168.1.23) starting at 03:17 AM.",
  observed_evidence: [
    "Outbound traffic escalated to 2.1 MB (86.0x higher than baseline 25 KB)",
    "47 unique destination IPs contacted vs 5 expected (9.4x baseline)",
    "340 connection attempts failed (potential port scan or unreachable remote infrastructure)",
    "Activity observed at 03:17 AM (normal active hours: 08:00-22:00)"
  ],
  possible_explanations: [
    "Internal host performing automated network reconnaissance or port scanning",
    "Data staging or unauthorized upload attempt via non-standard ports",
    "Malware attempting to contact unavailable C2 nodes causing high connection failure rate",
    "Legitimate scheduled backup, automated script, or misconfigured application"
  ],
  check_first: [
    {
      priority: 1,
      action: "Review DNS query logs for the host around 03:17 AM",
      reason: "Identify if destination IPs correlate with newly registered domain queries or DGA patterns.",
      supporting_signal: "destination_explosion",
      evidence_available: false
    },
    {
      priority: 2,
      action: "Inspect outbound connection sockets and remote ports",
      reason: "Determine whether traffic targeted external IPs or attempted lateral movement within the subnet.",
      supporting_signal: "traffic_spike",
      evidence_available: true
    },
    {
      priority: 3,
      action: "Check running processes and scheduled tasks on the workstation",
      reason: "Pinpoint the executable or script initiating network traffic during non-business hours.",
      supporting_signal: "unusual_hours",
      evidence_available: false
    },
    {
      priority: 4,
      action: "Verify user authentication and physical device presence",
      reason: "Confirm whether the student was actively using the device at 03:17 AM or if credentials were breached.",
      supporting_signal: "unusual_hours",
      evidence_available: true
    },
    {
      priority: 5,
      action: "Evaluate network isolation if anomalous outbound volume persists",
      reason: "Prevent further data exfiltration or lateral spreading while the system is inspected.",
      supporting_signal: "traffic_spike",
      evidence_available: true
    }
  ],
  next_steps: [
    "If destination IPs are confirmed malicious, quarantine host from the network",
    "Inspect local security event logs (Windows Event Logs or macOS syslog) for process creation at 03:17 AM",
    "Check whether other internal workstations received inbound connections from 192.168.1.23"
  ],
  confidence: "HIGH",
  generated_by: "deterministic_fallback"
};

export const MOCK_HERO_DEVICE_DETAIL: Device = {
  id: "192.168.1.23",
  name: "Student-Laptop",
  type: "Workstation",
  ip: "192.168.1.23",
  mac: "00:1B:44:11:3A:B7",
  status: "critical",
  risk_score: 94.0,
  last_seen: "2026-10-24T03:18:00Z",
  baseline: {
    avg_bytes_sent: 25600,
    avg_bytes_received: 102400,
    avg_connections: 32,
    avg_unique_destinations: 5,
    avg_failed_connections: 2,
    avg_dns_requests: 18,
    active_hours_start: 8,
    active_hours_end: 22
  },
  current_metrics: {
    bytes_sent: 2202010,
    bytes_received: 512000,
    connections: 430,
    unique_destinations: 47,
    failed_connections: 340,
    dns_requests: 180,
    activity_hour: 3
  }
};

export const MOCK_TIMELINE_SERIES: TimelineEntry[] = [
  { timestamp: "2026-10-23T22:00:00Z", bytes_sent: 24100, bytes_received: 105200, connections: 30, failed_connections: 1, unique_destinations: 5, dns_requests: 16, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-23T23:00:00Z", bytes_sent: 1200, bytes_received: 4500, connections: 2, failed_connections: 0, unique_destinations: 1, dns_requests: 2, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T00:00:00Z", bytes_sent: 800, bytes_received: 2100, connections: 1, failed_connections: 0, unique_destinations: 1, dns_requests: 1, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T01:00:00Z", bytes_sent: 600, bytes_received: 1800, connections: 1, failed_connections: 0, unique_destinations: 1, dns_requests: 1, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T02:00:00Z", bytes_sent: 750, bytes_received: 1950, connections: 1, failed_connections: 0, unique_destinations: 1, dns_requests: 1, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T03:00:00Z", bytes_sent: 2202010, bytes_received: 512000, connections: 430, failed_connections: 340, unique_destinations: 47, dns_requests: 180, risk_score: 94.0, is_anomaly: true },
  { timestamp: "2026-10-24T04:00:00Z", bytes_sent: 32000, bytes_received: 48000, connections: 4, failed_connections: 1, unique_destinations: 2, dns_requests: 5, risk_score: 15.0, is_anomaly: false },
  { timestamp: "2026-10-24T05:00:00Z", bytes_sent: 1100, bytes_received: 3200, connections: 2, failed_connections: 0, unique_destinations: 1, dns_requests: 2, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T06:00:00Z", bytes_sent: 950, bytes_received: 2900, connections: 1, failed_connections: 0, unique_destinations: 1, dns_requests: 1, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T07:00:00Z", bytes_sent: 4500, bytes_received: 12000, connections: 8, failed_connections: 0, unique_destinations: 3, dns_requests: 6, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T08:00:00Z", bytes_sent: 26000, bytes_received: 104000, connections: 34, failed_connections: 1, unique_destinations: 6, dns_requests: 20, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T09:00:00Z", bytes_sent: 28500, bytes_received: 118000, connections: 38, failed_connections: 2, unique_destinations: 5, dns_requests: 22, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T10:00:00Z", bytes_sent: 24800, bytes_received: 98000, connections: 31, failed_connections: 1, unique_destinations: 5, dns_requests: 18, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T11:00:00Z", bytes_sent: 31200, bytes_received: 124000, connections: 42, failed_connections: 2, unique_destinations: 7, dns_requests: 25, risk_score: 0.0, is_anomaly: false },
  { timestamp: "2026-10-24T12:00:00Z", bytes_sent: 18400, bytes_received: 75000, connections: 22, failed_connections: 1, unique_destinations: 4, dns_requests: 14, risk_score: 0.0, is_anomaly: false }
];

export function generate42Devices(isSimulationActive: boolean = false): DeviceListItem[] {
  const devices: DeviceListItem[] = [
    {
      id: "192.168.1.23",
      name: "Student-Laptop",
      type: "Workstation",
      ip: "192.168.1.23",
      mac: "00:1B:44:11:3A:B7",
      status: isSimulationActive ? "critical" : "healthy",
      risk_score: isSimulationActive ? 94.0 : 0.0,
      last_seen: isSimulationActive ? "2026-10-24T03:18:00Z" : "2026-10-24T14:35:00Z"
    },
    { id: "192.168.1.1", name: "Domain-Controller", type: "Server", ip: "192.168.1.1", mac: "00:1B:44:00:01:00", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:35:00Z" },
    { id: "192.168.1.2", name: "File-Server-01", type: "Server", ip: "192.168.1.2", mac: "00:1B:44:00:02:00", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:34:00Z" },
    { id: "192.168.1.3", name: "Mail-Server", type: "Server", ip: "192.168.1.3", mac: "00:1B:44:00:03:00", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:35:00Z" },
    { id: "192.168.1.4", name: "Backup-NAS", type: "Server", ip: "192.168.1.4", mac: "00:1B:44:00:04:00", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:30:00Z" },
    { id: "192.168.1.5", name: "Database-Master", type: "Server", ip: "192.168.1.5", mac: "00:1B:44:00:05:00", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:35:00Z" },
    { id: "192.168.1.6", name: "Web-Proxy", type: "Server", ip: "192.168.1.6", mac: "00:1B:44:00:06:00", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:35:00Z" },
    { id: "192.168.1.10", name: "Admin-Workstation", type: "Workstation", ip: "192.168.1.10", mac: "00:1B:44:AB:CD:EF", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:30:00Z" },
    { id: "192.168.1.11", name: "Developer-MacBook", type: "Workstation", ip: "192.168.1.11", mac: "00:1B:44:12:34:56", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:32:00Z" },
    { id: "192.168.1.12", name: "Finance-Desktop", type: "Workstation", ip: "192.168.1.12", mac: "00:1B:44:12:34:57", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:28:00Z" },
    { id: "192.168.1.13", name: "HR-Laptop", type: "Workstation", ip: "192.168.1.13", mac: "00:1B:44:12:34:58", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:25:00Z" },
    { id: "192.168.1.14", name: "Design-Studio-iMac", type: "Workstation", ip: "192.168.1.14", mac: "00:1B:44:12:34:59", status: "healthy", risk_score: 0.0, last_seen: "2026-10-24T14:30:00Z" },
  ];

  for (let i = 1; i <= 10; i++) {
    const ipNum = 14 + i;
    devices.push({
      id: `192.168.1.${ipNum}`,
      name: `Lab-PC-${String(i).padStart(2, "0")}`,
      type: "Workstation",
      ip: `192.168.1.${ipNum}`,
      mac: `00:1B:44:20:${String(i).padStart(2, "0")}:11`,
      status: "healthy",
      risk_score: 0.0,
      last_seen: "2026-10-24T14:20:00Z"
    });
  }

  for (let i = 1; i <= 10; i++) {
    const ipNum = 49 + i;
    devices.push({
      id: `192.168.1.${ipNum}`,
      name: `Guest-Phone-${String(i).padStart(2, "0")}`,
      type: "Mobile",
      ip: `192.168.1.${ipNum}`,
      mac: `00:1B:44:30:${String(i).padStart(2, "0")}:AA`,
      status: "healthy",
      risk_score: 0.0,
      last_seen: "2026-10-24T14:15:00Z"
    });
  }

  const iotNames = [
    "Camera-Lobby", "Camera-Parking", "Thermostat-East", "Thermostat-West",
    "Smart-Display-1", "Smart-Display-2", "Access-Badge-Reader",
    "Environment-Sensor", "Smart-Plug-ServerRoom", "Conference-VoIP"
  ];
  iotNames.forEach((name, idx) => {
    const ipNum = 100 + idx;
    devices.push({
      id: `192.168.1.${ipNum}`,
      name,
      type: "IoT",
      ip: `192.168.1.${ipNum}`,
      mac: `00:1B:44:A0:${String(idx).padStart(2, "0")}:99`,
      status: "healthy",
      risk_score: 0.0,
      last_seen: "2026-10-24T14:35:00Z"
    });
  });

  return devices;
}
