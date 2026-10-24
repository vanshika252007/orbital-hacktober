import React, { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  Sparkles,
  Cpu,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Alert } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';

interface AlertsPageProps {
  alerts: Alert[];
  onOpenInvestigation: (alertId: string) => void;
  onInspectDevice: (deviceId: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  onOpenInvestigation,
  onInspectDevice,
}) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredAlerts = useMemo(() => {
    return (alerts || []).filter((a) => {
      const query = search.toLowerCase();
      const matchesSearch =
        a.device_name?.toLowerCase().includes(query) ||
        a.device_id?.toLowerCase().includes(query) ||
        a.primary_reason?.toLowerCase().includes(query) ||
        a.id?.toLowerCase().includes(query);

      const matchesSeverity =
        severityFilter === 'ALL' ||
        a.severity?.toUpperCase() === severityFilter.toUpperCase();

      const matchesStatus =
        statusFilter === 'ALL' ||
        a.status?.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    }).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  }, [alerts, search, severityFilter, statusFilter]);

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
            Security Incidents & Anomaly Alerts
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Behavioral deviations flagged by the ML rule evaluation engine and Isolation Forest
          </p>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Filter alerts..."
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
                width: '200px',
              }}
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
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
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>

        </div>
      </div>

      {/* Alert Feed or Empty State */}
      {filteredAlerts.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(66, 214, 160, 0.1)',
              border: '1px solid rgba(66, 214, 160, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <ShieldCheck size={26} color="#42D6A0" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            No Security Incidents Found
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0.35rem auto 0 auto' }}>
            All subnet endpoints are currently operating within their trained statistical profiles. Use the top bar control to simulate an incident.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: 'var(--bg-elevated)',
                borderColor: alert.severity === 'CRITICAL' ? 'rgba(255, 101, 122, 0.4)' : 'var(--border)',
                boxShadow: alert.severity === 'CRITICAL' ? '0 4px 20px rgba(255, 101, 122, 0.08)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <SeverityBadge severity={alert.severity} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {alert.device_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                    {alert.device_id}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    [{alert.id}]
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <Clock size={13} />
                    <span>{new Date(alert.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 101, 122, 0.15)',
                      border: '1px solid rgba(255, 101, 122, 0.35)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.65rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: '#FF657A',
                      fontSize: '0.85rem',
                    }}
                  >
                    Risk {alert.risk_score}/100
                  </div>
                </div>
              </div>

              {/* Primary explanation */}
              <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginTop: '0.85rem', lineHeight: 1.5 }}>
                {alert.primary_reason}
              </p>

              {/* Signals Breakdown */}
              {alert.signals && alert.signals.length > 0 && (
                <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {alert.signals.map((sig, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.74rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {sig.type.replace(/_/g, ' ')}:
                      </span>{' '}
                      <span style={{ fontWeight: 600, color: sig.deviation_factor > 10 ? '#FF657A' : '#F4BD50' }}>
                        {sig.deviation_factor}x baseline
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => onInspectDevice(alert.device_id)}
                  className="pill-button pill-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.76rem' }}
                >
                  <Cpu size={13} />
                  <span>Inspect Device Telemetry</span>
                </button>

                <button
                  onClick={() => onOpenInvestigation(alert.id)}
                  className="pill-button pill-primary"
                  style={{ padding: '0.4rem 1.1rem', fontSize: '0.76rem' }}
                >
                  <Sparkles size={13} />
                  <span>Launch Investigation Workspace</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
