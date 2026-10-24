import React from 'react';
import { NetworkStats, DeviceListItem, Alert, TimelineEntry } from '../../types';
import { CinematicHero } from './CinematicHero';
import { ActivityChart } from './ActivityChart';
import { RiskDistribution } from './RiskDistribution';
import { PriorityQueue } from './PriorityQueue';
import { HardDrive, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';

interface NetworkOverviewProps {
  stats: NetworkStats;
  devices: DeviceListItem[];
  alerts: Alert[];
  timeline: TimelineEntry[];
  isSimulationActive: boolean;
  onSelectDevice: (deviceId: string) => void;
  onOpenInvestigation: (alertId: string) => void;
  onStartSimulation: () => void;
  onResetSimulation: () => void;
  onNavigateDevices: () => void;
  loadingAction: boolean;
}

export const NetworkOverview: React.FC<NetworkOverviewProps> = ({
  stats,
  devices,
  alerts,
  timeline,
  isSimulationActive,
  onSelectDevice,
  onOpenInvestigation,
  onStartSimulation,
  onResetSimulation,
  onNavigateDevices,
  loadingAction,
}) => {
  const isCritical = stats.network_health === 'CRITICAL' || isSimulationActive;

  const metrics = [
    {
      label: 'Total Devices',
      value: String(stats.total_devices || 42),
      sub: 'Monitored endpoints',
      icon: HardDrive,
      color: 'var(--text-primary)',
    },
    {
      label: 'Active Anomalies',
      value: String(isSimulationActive ? 1 : (stats.active_anomalies || 0)),
      sub: isCritical ? 'Threshold deviation' : 'No deviations',
      icon: AlertTriangle,
      color: isCritical ? 'var(--status-warning)' : 'var(--status-healthy)',
    },
    {
      label: 'Critical Alerts',
      value: String(isSimulationActive ? 1 : (stats.critical_count || 0)),
      sub: isCritical ? 'Student-Laptop (94)' : 'No incidents',
      icon: ShieldAlert,
      color: isCritical ? 'var(--status-critical)' : 'var(--status-healthy)',
    },
    {
      label: 'Events Processed',
      value: (stats.total_events || 7056).toLocaleString(),
      sub: 'Telemetry records',
      icon: Cpu,
      color: 'var(--text-primary)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Full-viewport Cinematic Hero */}
      <CinematicHero
        stats={stats}
        devices={devices}
        isSimulationActive={isSimulationActive}
        onOpenInvestigation={onOpenInvestigation}
        onNavigateDevices={onNavigateDevices}
        onSelectDevice={onSelectDevice}
      />

      {/* Transition into dashboard content */}
      <div className="dashboard-section">

        {/* Compact Metrics Row */}
        <div className="metrics-row">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="metric-cell">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="metric-label">{m.label}</span>
                  <Icon size={14} color={m.color} style={{ opacity: 0.6 }} />
                </div>
                <span className="metric-value" style={{ color: m.color }}>{m.value}</span>
                <span className="metric-sub">{m.sub}</span>
              </div>
            );
          })}
        </div>

        {/* Demo Lifecycle Toggle (discreet) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.8rem 1.2rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '0.76rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>Presentation:</span>
            <span style={{ color: isCritical ? 'var(--status-critical)' : 'var(--status-healthy)', fontWeight: 600 }}>
              {isCritical ? 'Incident Detection & Guidance' : 'Clean Baseline Monitoring'}
            </span>
          </div>
          <div>
            {isCritical ? (
              <button
                onClick={onResetSimulation}
                disabled={loadingAction}
                className="pill-button pill-secondary"
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem' }}
              >
                Reset Baseline
              </button>
            ) : (
              <button
                onClick={onStartSimulation}
                disabled={loadingAction}
                className="pill-button pill-critical"
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem' }}
              >
                Trigger Hero Scenario
              </button>
            )}
          </div>
        </div>

        {/* Priority Investigation Queue */}
        <PriorityQueue
          alerts={alerts}
          onOpenInvestigation={onOpenInvestigation}
          onInspectDevice={onSelectDevice}
        />

        {/* Activity Chart & Risk Distribution */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <ActivityChart
            timeline={timeline}
            isSimulationActive={isSimulationActive}
          />
          <RiskDistribution
            devices={devices}
            isSimulationActive={isSimulationActive}
          />
        </div>
      </div>
    </div>
  );
};
