import React, { useState, useMemo } from 'react';
import { Search, Laptop, Server, Smartphone, Cpu, ChevronRight } from 'lucide-react';
import { DeviceListItem } from '../../types';
import { RiskMeter } from '../common/RiskMeter';

interface DevicesPageProps {
  devices: DeviceListItem[];
  onSelectDevice: (deviceId: string) => void;
  heroDeviceId?: string;
}

export const DevicesPage: React.FC<DevicesPageProps> = ({
  devices,
  onSelectDevice,
  heroDeviceId = '192.168.1.23',
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'ip'>('risk');

  const filteredDevices = useMemo(() => {
    return (devices || [])
      .filter((d) => {
        const query = search.toLowerCase();
        const matchesSearch =
          d.name?.toLowerCase().includes(query) ||
          d.ip?.toLowerCase().includes(query) ||
          d.mac?.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === 'ALL' ||
          d.status?.toLowerCase() === statusFilter.toLowerCase();

        const matchesType =
          typeFilter === 'ALL' ||
          d.type?.toLowerCase() === typeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'risk') return (b.risk_score || 0) - (a.risk_score || 0);
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'ip') return (a.ip || '').localeCompare(b.ip || '');
        return 0;
      });
  }, [devices, search, statusFilter, typeFilter, sortBy]);

  const getTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'server':
        return <Server size={14} color="#8FE3E8" />;
      case 'mobile':
        return <Smartphone size={14} color="#B5F2D5" />;
      case 'iot':
        return <Cpu size={14} color="#F4BD50" />;
      default:
        return <Laptop size={14} color="#42D6A0" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Monitored Endpoint Inventory
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Complete subnet roster of 42 endpoints with behavioral risk scoring and baseline metrics
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
          {/* Search Field */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search hostname, IP, MAC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '220px',
              }}
            />
          </div>

          {/* Status Filter Buttons */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid var(--border)',
            }}
          >
            {['ALL', 'CRITICAL', 'HEALTHY'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  background: statusFilter === st ? 'var(--border)' : 'transparent',
                  border: 'none',
                  color: statusFilter === st ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type Select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.42rem 0.65rem',
              fontSize: '0.76rem',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="Workstation">Workstations</option>
            <option value="Server">Core Servers</option>
            <option value="IoT">IoT & Facilities</option>
            <option value="Mobile">Mobile Endpoints</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.42rem 0.65rem',
              fontSize: '0.76rem',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="risk">Sort: Highest Risk</option>
            <option value="name">Sort: Hostname</option>
            <option value="ip">Sort: IP Address</option>
          </select>

        </div>
      </div>

      {/* Device Table */}
      <div className="card" style={{ padding: '0.5rem 0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              }}
            >
              <th style={{ padding: '0.75rem 1.25rem' }}>Endpoint & Subnet IP</th>
              <th style={{ padding: '0.75rem 1.25rem' }}>Role</th>
              <th style={{ padding: '0.75rem 1.25rem' }}>Hardware MAC</th>
              <th style={{ padding: '0.75rem 1.25rem', width: '180px' }}>Risk Assessment</th>
              <th style={{ padding: '0.75rem 1.25rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1.25rem' }}>Last Seen</th>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((device) => {
              const isCrit = device.status?.toLowerCase() === 'critical';
              const isHero = device.id === heroDeviceId;

              return (
                <tr
                  key={device.id}
                  onClick={() => onSelectDevice(device.id)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    backgroundColor: isCrit ? 'rgba(255, 101, 122, 0.05)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isCrit
                      ? 'rgba(255, 101, 122, 0.1)'
                      : 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isCrit
                      ? 'rgba(255, 101, 122, 0.05)'
                      : 'transparent';
                  }}
                >
                  {/* Name & IP */}
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: isCrit ? 'rgba(255, 101, 122, 0.15)' : 'var(--bg-elevated)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getTypeIcon(device.type)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontWeight: 600, color: isCrit ? '#FF657A' : 'var(--text-primary)', fontSize: '0.86rem' }}>
                            {device.name}
                          </span>
                          {isHero && isCrit && (
                            <span className="badge-pill badge-critical" style={{ fontSize: '0.62rem', padding: '0.05rem 0.4rem' }}>
                              ANOMALOUS
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>
                          {device.ip}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                    {device.type || 'Workstation'}
                  </td>

                  {/* MAC */}
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      {device.mac || 'N/A'}
                    </span>
                  </td>

                  {/* Risk Score */}
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <RiskMeter score={device.risk_score || 0} />
                  </td>

                  {/* Status */}
                  <td style={{ padding: '0.85rem 1.25rem' }}>
                    <span className={`badge-pill badge-${isCrit ? 'critical' : 'healthy'}`}>
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: isCrit ? '#FF657A' : '#42D6A0',
                        }}
                      />
                      {device.status || 'healthy'}
                    </span>
                  </td>

                  {/* Last Seen */}
                  <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                    {device.last_seen ? new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                    <button
                      className="pill-button pill-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDevice(device.id);
                      }}
                    >
                      <span>Inspect</span>
                      <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
