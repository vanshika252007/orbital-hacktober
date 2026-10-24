import {
  HealthStatus,
  NetworkStats,
  Device,
  DeviceListItem,
  TimelineEntry,
  Alert,
  Investigation
} from '../types';
import {
  MOCK_STATS_CLEAN,
  MOCK_STATS_SIMULATION,
  MOCK_HERO_ALERT,
  MOCK_INVESTIGATION,
  MOCK_HERO_DEVICE_DETAIL,
  MOCK_TIMELINE_SERIES,
  generate42Devices
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let localSimulationActive = false;
let backendOnline = true;
let onBackendStatusChangeCallback: ((online: boolean) => void) | null = null;

export function registerBackendStatusListener(callback: (online: boolean) => void) {
  onBackendStatusChangeCallback = callback;
}

function updateBackendStatus(isOnline: boolean) {
  if (backendOnline !== isOnline) {
    backendOnline = isOnline;
    if (onBackendStatusChangeCallback) {
      onBackendStatusChangeCallback(isOnline);
    }
  }
}

/**
 * Mathematical consistency helper to compute exact deviation multiplier.
 * Avoids hardcoded contradictory explanations (e.g. computes 2,202,010 / 25,600 ≈ 86.0x).
 */
export function computeDeviationRatio(measured: number, baseline: number): number {
  if (!baseline || baseline === 0) return 1.0;
  return Number((measured / baseline).toFixed(1));
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    updateBackendStatus(true);
    return (await res.json()) as T;
  } catch (err: any) {
    updateBackendStatus(false);
    throw err;
  }
}

export const api = {
  isBackendOnline(): boolean {
    return backendOnline;
  },

  isSimulationActiveLocally(): boolean {
    return localSimulationActive;
  },

  async getHealth(): Promise<HealthStatus> {
    try {
      return await request<HealthStatus>('/health');
    } catch {
      return {
        status: "ok",
        database_connected: true,
        simulation_active: localSimulationActive,
        timestamp: new Date().toISOString(),
        offline_fallback: true
      };
    }
  },

  async getStats(): Promise<NetworkStats> {
    try {
      return await request<NetworkStats>('/stats');
    } catch {
      return localSimulationActive ? MOCK_STATS_SIMULATION : MOCK_STATS_CLEAN;
    }
  },

  async getDevices(): Promise<DeviceListItem[]> {
    try {
      return await request<DeviceListItem[]>('/devices');
    } catch {
      return generate42Devices(localSimulationActive);
    }
  },

  async getDevice(id: string): Promise<Device> {
    try {
      return await request<Device>(`/devices/${id}`);
    } catch {
      if (id === '192.168.1.23') {
        const detail = JSON.parse(JSON.stringify(MOCK_HERO_DEVICE_DETAIL)) as Device;
        if (!localSimulationActive) {
          detail.status = 'healthy';
          detail.risk_score = 0;
          if (detail.current_metrics) {
            detail.current_metrics.bytes_sent = 25600;
            detail.current_metrics.failed_connections = 1;
            detail.current_metrics.unique_destinations = 5;
          }
        }
        return detail;
      }
      return {
        id,
        name: `Device-${id.split('.').pop()}`,
        type: 'Workstation',
        ip: id,
        mac: '00:1B:44:FF:EE:DD',
        status: 'healthy',
        risk_score: 0.0,
        last_seen: new Date().toISOString(),
        baseline: {
          avg_bytes_sent: 25000,
          avg_bytes_received: 100000,
          avg_connections: 30,
          avg_unique_destinations: 5,
          avg_failed_connections: 1,
          avg_dns_requests: 15,
          active_hours_start: 8,
          active_hours_end: 20
        },
        current_metrics: {
          bytes_sent: 22000,
          bytes_received: 95000,
          connections: 28,
          unique_destinations: 5,
          failed_connections: 1,
          dns_requests: 14,
          activity_hour: 14
        }
      };
    }
  },

  async getDeviceTimeline(id: string): Promise<TimelineEntry[]> {
    try {
      return await request<TimelineEntry[]>(`/devices/${id}/timeline`);
    } catch {
      return MOCK_TIMELINE_SERIES;
    }
  },

  async getAlerts(severity?: string, status?: string): Promise<Alert[]> {
    try {
      const params = new URLSearchParams();
      if (severity) params.append('severity', severity);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await request<Alert[]>(`/alerts${query}`);
    } catch {
      return localSimulationActive ? [MOCK_HERO_ALERT] : [];
    }
  },

  async getAlert(id: string): Promise<Alert> {
    try {
      return await request<Alert>(`/alerts/${id}`);
    } catch {
      return MOCK_HERO_ALERT;
    }
  },

  async getAnomalies(): Promise<any[]> {
    try {
      return await request<any[]>('/anomalies');
    } catch {
      return [];
    }
  },

  async startSimulation(): Promise<any> {
    localSimulationActive = true;
    try {
      return await request('/simulation/start', { method: 'POST' });
    } catch {
      return {
        message: "Deterministic hero anomaly injected successfully (Demo Fallback)",
        scenario: "hero_student_laptop_anomaly",
        device_id: "192.168.1.23",
        device_name: "Student-Laptop",
        alert_id: "alert_hero_001",
        risk_score: 94.0,
        status: "critical"
      };
    }
  },

  async resetSimulation(): Promise<any> {
    localSimulationActive = false;
    try {
      return await request('/simulation/reset', { method: 'POST' });
    } catch {
      return {
        message: "Simulation reset to baseline clean state (Demo Fallback)",
        devices_restored: 42,
        alerts_cleared: 1,
        anomalies_cleared: 1
      };
    }
  },

  async getInvestigation(alertId: string): Promise<Investigation> {
    try {
      return await request<Investigation>(`/investigations/${alertId}`);
    } catch {
      return MOCK_INVESTIGATION;
    }
  },

  async generateInvestigation(alertId: string): Promise<Investigation> {
    try {
      return await request<Investigation>(`/investigations/${alertId}/generate`, { method: 'POST' });
    } catch {
      return MOCK_INVESTIGATION;
    }
  }
};
