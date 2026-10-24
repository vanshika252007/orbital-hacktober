import React from 'react';
import {
  HardDrive,
  ArrowLeft,
  Activity,
  Sparkles
} from 'lucide-react';
import { Device, TimelineEntry } from '../../types';
import { RiskMeter } from '../common/RiskMeter';
import { computeDeviationRatio } from '../../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface DeviceDetailPageProps {
  device: Device;
  timeline: TimelineEntry[];
  onBack: () => void;
  onOpenInvestigation: (alertId: string) => void;
}

export const DeviceDetailPage: React.FC<DeviceDetailPageProps> = ({
  device,
  timeline,
  onBack,
  onOpenInvestigation,
}) => {
  const isCrit = device.status?.toLowerCase() === 'critical' || device.risk_score >= 75;
  const baseline = device.baseline || {} as any;
  const current = device.current_metrics || {} as any;

  const formatBytes = (bytes?: number) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  // Recharts timeline series
  const chartData = (timeline || []).map((entry) => ({
    ...entry,
    time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    sent: entry.bytes_sent,
    recv: entry.bytes_received,
  }));

  // Computed ratios following mathematical consistency rule
  const outboundRatio = computeDeviationRatio(current.bytes_sent, baseline.avg_bytes_sent);
  const failedRatio = computeDeviationRatio(current.failed_connections, baseline.avg_failed_connections);
  const destRatio = computeDeviationRatio(current.unique_destinations, baseline.avg_unique_destinations);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Navigation Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          className="pill-button pill-secondary"
          style={{ padding: '0.4rem 0.85rem' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Device Inventory</span>
        </button>

        {isCrit && (
          <button
            onClick={() => onOpenInvestigation('alert_hero_001')}
            className="pill-button pill-primary"
            style={{ padding: '0.45rem 1.1rem' }}
          >
            <Sparkles size={14} />
            <span>Launch AI Investigation Workspace</span>
          </button>
        )}
      </div>

      {/* Device Summary Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-elevated)',
          borderColor: isCrit ? 'rgba(255, 101, 122, 0.4)' : 'var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: isCrit ? 'rgba(255, 101, 122, 0.15)' : 'rgba(66, 214, 160, 0.12)',
              border: `1px solid ${isCrit ? 'rgba(255, 101, 122, 0.35)' : 'rgba(66, 214, 160, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={22} color={isCrit ? '#FF657A' : '#42D6A0'} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                {device.name}
              </h1>
              <span className={`badge-pill badge-${isCrit ? 'critical' : 'healthy'}`}>
                {device.status || 'healthy'}
              </span>
              <span className="badge-pill badge-mint" style={{ fontSize: '0.68rem' }}>
                {device.type || 'Workstation'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px', fontSize: '0.78rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                IP: {device.ip}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                MAC: {device.mac}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Last Telemetry: {device.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'Continuous'}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Score Widget */}
        <div style={{ minWidth: '160px' }}>
          <RiskMeter score={device.risk_score || 0} />
        </div>
      </div>

      {/* Baseline vs Current Side-by-Side Comparison */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.85rem',
          }}
        >
          Baseline vs. Current Behavioral Metrics
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Outbound Traffic */}
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Outbound Volume
            </span>
            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: outboundRatio > 2 ? '#FF657A' : 'var(--text-primary)' }}>
                {formatBytes(current.bytes_sent ?? baseline.avg_bytes_sent)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Avg: {formatBytes(baseline.avg_bytes_sent)}
              </span>
            </div>
            {outboundRatio > 1.5 && (
              <div style={{ fontSize: '0.74rem', color: '#FF657A', fontWeight: 600, marginTop: '4px' }}>
                &bull; {outboundRatio}x deviation from baseline
              </div>
            )}
          </div>

          {/* Failed Connections */}
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Failed Connections
            </span>
            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: failedRatio > 5 ? '#FF657A' : 'var(--text-primary)' }}>
                {current.failed_connections ?? baseline.avg_failed_connections ?? 0}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Avg: {baseline.avg_failed_connections ?? 0}
              </span>
            </div>
            {failedRatio > 5 && (
              <div style={{ fontSize: '0.74rem', color: '#FF657A', fontWeight: 600, marginTop: '4px' }}>
                &bull; {failedRatio}x burst failure rate
              </div>
            )}
          </div>

          {/* Unique Destinations */}
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Unique Destinations
            </span>
            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: destRatio > 3 ? '#FF657A' : 'var(--text-primary)' }}>
                {current.unique_destinations ?? baseline.avg_unique_destinations ?? 0}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Avg: {baseline.avg_unique_destinations ?? 0}
              </span>
            </div>
            {destRatio > 3 && (
              <div style={{ fontSize: '0.74rem', color: '#FF657A', fontWeight: 600, marginTop: '4px' }}>
                &bull; {destRatio}x reconnaissance spread
              </div>
            )}
          </div>

          {/* Active Operating Hours */}
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Operating Window
            </span>
            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: isCrit ? '#FF657A' : 'var(--text-primary)' }}>
                {isCrit ? '03:17 AM' : '14:30 PM'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Baseline: {String(baseline.active_hours_start ?? 8).padStart(2, '0')}:00 - {String(baseline.active_hours_end ?? 22).padStart(2, '0')}:00
              </span>
            </div>
            {isCrit && (
              <div style={{ fontSize: '0.74rem', color: '#FF657A', fontWeight: 600, marginTop: '4px' }}>
                &bull; Off-hours activity breach
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline Chart */}
      <div className="card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} color="var(--accent-mint)" />
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              24-Hour Behavioral Telemetry Trend
            </h3>
          </div>
          {isCrit && (
            <span className="badge-pill badge-critical" style={{ fontSize: '0.68rem' }}>
              Anomaly Spike at 03:00 AM
            </span>
          )}
        </div>

        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="devSentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isCrit ? "#FF657A" : "#8FE3E8"} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={isCrit ? "#FF657A" : "#8FE3E8"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#283932" strokeDasharray="3 3" opacity={0.4} vertical={false} />
              <XAxis dataKey="time" stroke="#60756C" fontSize={11} tickLine={false} axisLine={{ stroke: '#283932' }} />
              <YAxis stroke="#60756C" fontSize={11} tickFormatter={formatBytes} tickLine={false} axisLine={{ stroke: '#283932' }} width={65} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.74rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--accent-mint)' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)' }}>Outbound: {formatBytes(data.sent)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Connections: {data.connections} (Failed: {data.failed_connections})</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="sent" stroke={isCrit ? "#FF657A" : "#8FE3E8"} strokeWidth={2} fill="url(#devSentGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
