export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export type DeviceStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export type Confidence = 'low' | 'medium' | 'high' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface Signal {
  type: string;
  severity: Severity;
  measured_value: number;
  baseline_value: number;
  deviation_factor: number;
  explanation: string;
}

export interface DeviceBaseline {
  avg_bytes_sent: number;
  avg_bytes_received: number;
  avg_connections: number;
  avg_unique_destinations: number;
  avg_failed_connections: number;
  avg_dns_requests: number;
  active_hours_start: number;
  active_hours_end: number;
}

export interface CurrentMetrics {
  bytes_sent: number;
  bytes_received: number;
  connections: number;
  unique_destinations: number;
  failed_connections: number;
  dns_requests: number;
  activity_hour: number;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  ip: string;
  mac: string;
  status: DeviceStatus;
  risk_score: number;
  last_seen?: string;
  baseline: DeviceBaseline;
  current_metrics?: CurrentMetrics;
}

export interface DeviceListItem {
  id: string;
  name: string;
  type: string;
  ip: string;
  mac: string;
  status: DeviceStatus;
  risk_score: number;
  last_seen?: string;
}

export interface Alert {
  id: string;
  device_id: string;
  device_name: string;
  risk_score: number;
  severity: Severity;
  status: AlertStatus;
  detected_at: string;
  primary_reason: string;
  signals_count: number;
  signals: Signal[];
}

export interface CheckFirstItem {
  priority: number;
  action: string;
  reason: string;
  supporting_signal?: string;
  evidence_available?: boolean;
}

export interface Investigation {
  alert_id: string;
  device_id: string;
  summary: string;
  observed_evidence: string[];
  possible_explanations: string[];
  check_first: CheckFirstItem[];
  next_steps: string[];
  confidence: string;
  generated_by: string;
}

export interface NetworkStats {
  total_devices: number;
  active_anomalies: number;
  critical_count: number;
  total_events: number;
  network_health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | string;
}

export interface TimelineEntry {
  timestamp: string;
  bytes_sent: number;
  bytes_received: number;
  connections: number;
  failed_connections: number;
  unique_destinations: number;
  dns_requests: number;
  risk_score: number;
  is_anomaly: boolean;
}

export interface HealthStatus {
  status: string;
  database_connected: boolean;
  simulation_active: boolean;
  timestamp: string;
  uptime_seconds?: number;
  offline_fallback?: boolean;
}

export type ActivePage = 'overview' | 'devices' | 'alerts' | 'device-detail' | 'investigation';
