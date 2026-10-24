import React from 'react';
import { NetworkStats, DeviceListItem, Alert, TimelineEntry } from '../../types';
import { MetricCard } from '../common/MetricCard';
import { NetworkTopology } from './NetworkTopology';
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
  loadingAction,
}) => {
  const isCritical = stats.network_health === 'CRITICAL' || isSimulationActive;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Page Heading & Hero Positioning */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          paddingBottom: '0.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span
              className="badge-pill badge-mint"
              style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}
            >
              SOC Behavioral Defense
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              Subnet 192.168.1.0/24 Continuous Telemetry
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.1rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}
          >
            See what shouldn't be happening.
          </h1>

          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-muted)',
              marginTop: '0.35rem',
              maxWidth: '620px',
              lineHeight: 1.5,
            }}
          >
            Monitor device behavior, uncover suspicious deviations, and investigate with evidence.
          </p>
        </div>

        {/* Demo Scenario Stepper Card */}
        <div
          className="card"
          style={{
            padding: '0.9rem 1.15rem',
            backgroundColor: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Presentation Lifecycle
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isCritical ? '#FF657A' : '#42D6A0', marginTop: '2px' }}>
              {isCritical ? 'Scene 3-5: Incident Detection & Guidance' : 'Scene 1: Clean Baseline Monitoring'}
            </div>
          </div>

          <div>
            {isCritical ? (
              <button
                onClick={onResetSimulation}
                disabled={loadingAction}
                className="pill-button pill-secondary"
                style={{ fontSize: '0.76rem', padding: '0.4rem 0.85rem' }}
              >
                Reset Demo Baseline
              </button>
            ) : (
              <button
                onClick={onStartSimulation}
                disabled={loadingAction}
                className="pill-button pill-critical"
                style={{ fontSize: '0.76rem', padding: '0.4rem 0.85rem' }}
              >
                Trigger Hero Scenario
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.15rem',
        }}
      >
        <MetricCard
          title="Total Devices"
          value={stats.total_devices || 42}
          subtext="Monitored /24 endpoints"
          icon={HardDrive}
          variant="default"
          badge="Nominal"
        />

        <MetricCard
          title="Active Anomalies"
          value={isSimulationActive ? 1 : (stats.active_anomalies || 0)}
          subtext={isCritical ? "Threshold deviation detected" : "0 deviations exceeding baseline"}
          icon={AlertTriangle}
          variant={isCritical ? "warning" : "healthy"}
          badge={isCritical ? "Alert" : "Clean"}
        />

        <MetricCard
          title="Critical Alerts"
          value={isSimulationActive ? 1 : (stats.critical_count || 0)}
          subtext={isCritical ? "Student-Laptop (Risk 94/100)" : "No high-severity incidents"}
          icon={ShieldAlert}
          variant={isCritical ? "critical" : "healthy"}
          badge={isCritical ? "Triage" : "Nominal"}
        />

        <MetricCard
          title="Events Processed"
          value={(stats.total_events || 7056).toLocaleString()}
          subtext="Telemetry records evaluated"
          icon={Cpu}
          variant="default"
        />
      </div>

      {/* Signature Visual Feature: Network Topology Geometry */}
      <NetworkTopology
        devices={devices}
        isSimulationActive={isSimulationActive}
        onSelectDevice={onSelectDevice}
      />

      {/* Priority Investigation Queue (Alerts) */}
      <PriorityQueue
        alerts={alerts}
        onOpenInvestigation={onOpenInvestigation}
        onInspectDevice={onSelectDevice}
      />

      {/* Activity Chart & Risk Distribution Grid */}
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
  );
};
