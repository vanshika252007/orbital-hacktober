import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  Lightbulb,
  ListOrdered,
  RefreshCw,
  Info,
  ArrowRight
} from 'lucide-react';
import { Investigation } from '../../types';

interface InvestigationWorkspaceProps {
  investigation: Investigation | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onNavigateToDevice?: (deviceId: string) => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigation,
  onRegenerate,
  isRegenerating,
  onNavigateToDevice: _onNavigateToDevice,
}) => {
  const [completedSteps, setCompletedSteps] = useState<{ [key: number]: boolean }>({});
  const [isQuarantined, setIsQuarantined] = useState(false);

  if (!investigation) {
    return (
      <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
        <Sparkles size={28} color="var(--accent-mint)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          No Active Investigation Workspace Selected
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0.35rem auto 0 auto' }}>
          Trigger the hero anomaly scenario from the top bar to generate a real-time behavioral investigation.
        </p>
      </div>
    );
  }

  const toggleStep = (priority: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [priority]: !prev[priority],
    }));
  };

  const handleQuarantine = () => {
    setIsQuarantined(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Bar */}
      <div
        className="card"
        style={{
          padding: '1.4rem 1.6rem',
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'rgba(181, 242, 213, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(181, 242, 213, 0.2), rgba(143, 227, 232, 0.2))',
              border: '1px solid rgba(181, 242, 213, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={22} color="var(--accent-mint)" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                AI SOC Investigation Workspace
              </h1>
              <span className="badge-pill badge-critical">
                CRITICAL SEVERITY
              </span>
              <span className="badge-pill badge-mint" style={{ fontSize: '0.68rem' }}>
                Confidence: {investigation.confidence || 'HIGH'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '3px', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Target Endpoint: <strong style={{ color: 'var(--text-primary)' }}>{investigation.device_id}</strong>
              </span>
              <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                Alert ID: {investigation.alert_id}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>&bull;</span>
              <span style={{ color: 'var(--text-dim)' }}>
                Engine: {investigation.generated_by || 'deterministic_fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="pill-button pill-secondary"
            title="Trigger Teammate 4 investigation generation engine"
          >
            <RefreshCw size={14} className={isRegenerating ? "animate-spin-slow" : ""} />
            <span>{isRegenerating ? 'Analyzing Telemetry...' : 'Regenerate Guidance'}</span>
          </button>

          {!isQuarantined ? (
            <button
              onClick={handleQuarantine}
              className="pill-button pill-critical"
            >
              <ShieldAlert size={14} />
              <span>Quarantine Host</span>
            </button>
          ) : (
            <span className="badge-pill badge-healthy" style={{ padding: '0.4rem 0.85rem', fontSize: '0.74rem' }}>
              <ShieldCheck size={14} />
              Host Quarantined
            </span>
          )}
        </div>
      </div>

      {/* Quarantine Notification Banner */}
      {isQuarantined && (
        <div
          style={{
            backgroundColor: 'rgba(255, 101, 122, 0.1)',
            border: '1px solid rgba(255, 101, 122, 0.35)',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldAlert size={18} color="#FF657A" />
            <span style={{ fontSize: '0.84rem', color: '#FF657A', fontWeight: 600 }}>
              Device {investigation.device_id} isolated from subnet 192.168.1.0/24. Data egress halted.
            </span>
          </div>
          <span className="badge-pill badge-critical" style={{ fontSize: '0.68rem' }}>
            CONTAINMENT ACTIVE
          </span>
        </div>
      )}

      {/* Section A: Behavioral Summary */}
      <div className="card" style={{ padding: '1.35rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-mint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Executive Anomaly Summary
        </span>
        <p
          style={{
            fontSize: '0.94rem',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            marginTop: '0.5rem',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1rem',
          }}
        >
          {investigation.summary}
        </p>
      </div>

      {/* Section B: Observed Evidence vs Possible Explanations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Observed Evidence */}
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <AlertTriangle size={16} color="#FF657A" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              Observed Telemetry Evidence
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {investigation.observed_evidence?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.95rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  lineHeight: 1.45,
                }}
              >
                <span style={{ color: 'var(--accent-mint)', fontWeight: 700, marginTop: '1px' }}>&rsaquo;</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Possible Explanations (Hypotheses) */}
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <Lightbulb size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              Root Cause Hypotheses (Ranked Explanations)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {investigation.possible_explanations?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.75rem 0.95rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  lineHeight: 1.45,
                }}
              >
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginTop: '1px' }}>&bull;</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Section C: Prioritized SOC Action Plan (check_first) */}
      <div className="card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListOrdered size={16} color="var(--accent-mint)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
              What Should I Check First? (SOC Investigation Checklist)
            </h3>
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {Object.values(completedSteps).filter(Boolean).length} of {investigation.check_first?.length || 5} Triage Actions Completed
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {investigation.check_first?.map((step) => {
            const isDone = completedSteps[step.priority];

            return (
              <div
                key={step.priority}
                onClick={() => toggleStep(step.priority)}
                style={{
                  backgroundColor: isDone ? 'rgba(66, 214, 160, 0.05)' : 'var(--bg-elevated)',
                  border: `1px solid ${isDone ? 'rgba(66, 214, 160, 0.35)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  {isDone ? (
                    <CheckSquare size={18} color="#42D6A0" />
                  ) : (
                    <Square size={18} color="var(--text-dim)" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: step.priority <= 2 ? 'rgba(255, 101, 122, 0.2)' : 'rgba(181, 242, 213, 0.15)',
                        color: step.priority <= 2 ? '#FF657A' : 'var(--accent-mint)',
                      }}
                    >
                      PRIORITY {step.priority}
                    </span>
                    <strong
                      style={{
                        fontSize: '0.88rem',
                        color: isDone ? '#42D6A0' : '#FFFFFF',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {step.action}
                    </strong>
                    {step.evidence_available !== undefined && (
                      <span className="badge-pill" style={{ fontSize: '0.62rem', backgroundColor: step.evidence_available ? 'rgba(66,214,160,0.1)' : 'rgba(244,189,80,0.1)', color: step.evidence_available ? '#42D6A0' : '#F4BD50' }}>
                        {step.evidence_available ? 'Telemetry Ready' : 'External Corroboration Needed'}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                    {step.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section D: Evidence Limitations & Containment Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Next Containment Actions */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Containment & Escalation Recommendations
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.65rem' }}>
            {investigation.next_steps?.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <ArrowRight size={14} color="var(--accent-cyan)" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Limitations Disclosure */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
            <Info size={15} color="#F4BD50" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#F4BD50', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Telemetry Limitations Disclosure
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This investigation is derived from network layer flow telemetry (bytes transferred, destination diversity, connection failure rate, and timestamps). Local host executable tracking, process memory introspection, and DNS payload queries require complementary EDR agent telemetry.
          </p>
        </div>

      </div>

    </div>
  );
};
