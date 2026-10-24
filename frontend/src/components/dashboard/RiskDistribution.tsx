import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { PieChart } from 'lucide-react';
import { DeviceListItem } from '../../types';

interface RiskDistributionProps {
  devices: DeviceListItem[];
  isSimulationActive: boolean;
}

export const RiskDistribution: React.FC<RiskDistributionProps> = ({
  devices,
  isSimulationActive: _isSimulationActive,
}) => {
  // Aggregate real device counts
  const criticalCount = devices.filter((d) => d.status?.toLowerCase() === 'critical' || d.risk_score >= 75).length;
  const warningCount = devices.filter((d) => d.status?.toLowerCase() === 'warning' || (d.risk_score >= 30 && d.risk_score < 75)).length;
  const nominalCount = devices.filter((d) => (d.status?.toLowerCase() === 'healthy' || !d.status) && d.risk_score < 30).length;

  const data = [
    { name: 'Nominal', count: nominalCount, color: '#42D6A0' },
    { name: 'Warning', count: warningCount, color: '#F4BD50' },
    { name: 'Critical', count: criticalCount, color: '#FF657A' },
  ];

  return (
    <div className="card" style={{ padding: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieChart size={16} color="var(--accent-mint)" />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Subnet Risk Tier Distribution
          </h3>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {devices.length || 42} Nodes Total
        </span>
      </div>

      <div style={{ width: '100%', height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <XAxis
              type="number"
              stroke="#60756C"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#283932' }}
              domain={[0, (dataMax: number) => Math.max(dataMax + 4, 45)]}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#60756C"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#283932' }}
              width={70}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload;
                  return (
                    <div
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: entry.color }}>
                        {entry.name}: {entry.count} Endpoints
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
