import React from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldCheck, Sparkles, Cpu } from 'lucide-react';
import { Alert } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';

interface PriorityQueueProps {
  alerts: Alert[];
  onOpenInvestigation: (alertId: string) => void;
  onInspectDevice: (deviceId: string) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  alerts,
  onOpenInvestigation,
  onInspectDevice,
}) => {
  const sortedAlerts = [...(alerts || [])].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  if (sortedAlerts.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(66, 214, 160, 0.1)',
            border: '1px solid rgba(66, 214, 160, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.85rem auto',
          }}
        >
          <ShieldCheck size={22} color="#42D6A0" />
        </div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Priority Queue Nominal
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0.25rem auto 0 auto' }}>
          No active behavioral anomalies requiring prioritized SOC triage. Click "Simulate Suspicious Activity" above to test detection.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} color="#FF657A" />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Priority Investigation Queue ({sortedAlerts.length})
          </h3>
        </div>
        <span className="badge-pill badge-critical" style={{ fontSize: '0.68rem' }}>
          Action Required
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {sortedAlerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid rgba(255, 101, 122, 0.35)',
              borderRadius: '10px',
              padding: '1.1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              boxShadow: '0 4px 18px rgba(255, 101, 122, 0.08)',
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <SeverityBadge severity={alert.severity} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                  {alert.device_name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  {alert.device_id}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  <Clock size={13} />
                  <span>{new Date(alert.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 101, 122, 0.15)',
                    border: '1px solid rgba(255, 101, 122, 0.3)',
                    borderRadius: '6px',
                    padding: '0.2rem 0.6rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#FF657A',
                  }}
                >
                  Risk {alert.risk_score}/100
                </div>
              </div>
            </div>

            {/* Primary reason text */}
            <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {alert.primary_reason}
            </p>

            {/* Signals badge breakdown */}
            {alert.signals && alert.signals.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {alert.signals.map((sig, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {sig.type.replace(/_/g, ' ')}:
                    </span>
                    <span style={{ fontWeight: 600, color: sig.deviation_factor > 10 ? '#FF657A' : '#F4BD50' }}>
                      {sig.deviation_factor}x baseline
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => onInspectDevice(alert.device_id)}
                className="pill-button pill-secondary"
                style={{ padding: '0.38rem 0.8rem', fontSize: '0.76rem' }}
              >
                <Cpu size={13} />
                <span>Device Telemetry</span>
              </button>

              <button
                onClick={() => onOpenInvestigation(alert.id)}
                className="pill-button pill-primary"
                style={{ padding: '0.38rem 0.95rem', fontSize: '0.76rem' }}
              >
                <Sparkles size={13} />
                <span>Open Investigation Workspace</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
