import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';
import { TimelineEntry } from '../../types';

interface ActivityChartProps {
  timeline: TimelineEntry[];
  isSimulationActive: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.75rem',
          color: 'var(--text-primary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--accent-mint)', marginBottom: '4px' }}>
          Time: {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: '#8FE3E8' }}>Outbound: {formatBytes(data.bytes_sent)}</span>
          <span style={{ color: '#42D6A0' }}>Inbound: {formatBytes(data.bytes_received)}</span>
          <span style={{ color: 'var(--text-muted)' }}>Connections: {data.connections} (Failed: {data.failed_connections})</span>
        </div>
        {data.is_anomaly && (
          <div style={{ marginTop: '4px', color: '#FF657A', fontWeight: 700 }}>
            &bull; Anomaly Window [Risk {data.risk_score}/100]
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ActivityChart: React.FC<ActivityChartProps> = ({
  timeline,
  isSimulationActive,
}) => {
  const chartData = (timeline || []).map((entry) => {
    const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return {
      ...entry,
      time: timeStr,
      displaySent: entry.bytes_sent,
      displayRecv: entry.bytes_received,
    };
  });

  if (!chartData || chartData.length === 0) {
    return (
      <div className="card" style={{ padding: '1.4rem', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <AlertCircle size={28} color="var(--text-dim)" style={{ margin: '0 auto 0.5rem auto' }} />
          <p style={{ fontSize: '0.85rem' }}>No historical telemetry series available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color="var(--accent-cyan)" />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Subnet Aggregate Traffic Telemetry
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.74rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#8FE3E8' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8FE3E8' }} />
            <span>Outbound Bytes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#42D6A0' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#42D6A0' }} />
            <span>Inbound Bytes</span>
          </div>
          {isSimulationActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#FF657A' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF657A', boxShadow: '0 0 6px #FF657A' }} />
              <span>03:00 Spike (86.0x)</span>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div style={{ width: '100%', height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isSimulationActive ? "#FF657A" : "#8FE3E8"} stopOpacity={0.4} />
                <stop offset="95%" stopColor={isSimulationActive ? "#FF657A" : "#8FE3E8"} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#42D6A0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#42D6A0" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#283932" strokeDasharray="3 3" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#60756C"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#283932' }}
            />
            <YAxis
              stroke="#60756C"
              fontSize={11}
              tickFormatter={formatBytes}
              tickLine={false}
              axisLine={{ stroke: '#283932' }}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="displaySent"
              stroke={isSimulationActive ? "#FF657A" : "#8FE3E8"}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#outboundGrad)"
            />
            <Area
              type="monotone"
              dataKey="displayRecv"
              stroke="#42D6A0"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#inboundGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
