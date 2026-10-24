import React from 'react';
import { Play, RotateCcw, Sparkles, RefreshCw, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ActivePage } from '../../types';

interface HeaderProps {
  activePage: ActivePage;
  pageTitle: string;
  breadcrumb?: string;
  isSimulationActive: boolean;
  isBackendOnline: boolean;
  onStartSimulation: () => void;
  onResetSimulation: () => void;
  onQuickInvestigate: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  loadingAction: boolean;
  hasActiveAlert: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activePage: _activePage,
  pageTitle,
  breadcrumb,
  isSimulationActive,
  isBackendOnline,
  onStartSimulation,
  onResetSimulation,
  onQuickInvestigate,
  onRefresh,
  isRefreshing,
  loadingAction,
  hasActiveAlert,
}) => {
  return (
    <header
      style={{
        padding: '1.1rem 2rem',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Left: Page Title & Breadcrumb */}
      <div>
        {breadcrumb && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Network Anomaly Spotter</span>
            <span>/</span>
            <span>{breadcrumb}</span>
          </div>
        )}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          {pageTitle}
        </h2>
      </div>

      {/* Right: Monitoring State, Backend Indicator & Demo Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        
        {/* Network Monitoring Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.8rem',
            borderRadius: '9999px',
            backgroundColor: isSimulationActive ? 'rgba(255, 101, 122, 0.12)' : 'rgba(66, 214, 160, 0.12)',
            border: `1px solid ${isSimulationActive ? 'rgba(255, 101, 122, 0.35)' : 'rgba(66, 214, 160, 0.3)'}`,
            fontSize: '0.74rem',
            fontWeight: 600,
            color: isSimulationActive ? '#FF657A' : '#42D6A0',
          }}
        >
          {isSimulationActive ? (
            <>
              <AlertOctagon size={13} />
              <span>CRITICAL ANOMALY ACTIVE</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} />
              <span>MONITORING NOMINAL</span>
            </>
          )}
        </div>

        {/* Backend Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            fontSize: '0.74rem',
            color: isBackendOnline ? '#42D6A0' : '#F4BD50',
          }}
          title={isBackendOnline ? 'Connected to FastAPI Backend (8000)' : 'Running on Contract Fixtures'}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? '#42D6A0' : '#F4BD50',
            }}
          />
          <span>{isBackendOnline ? 'API Connected' : 'Fixture Mode'}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="pill-button pill-secondary"
          style={{ padding: '0.45rem 0.75rem' }}
          title="Refresh telemetry records"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin-slow" : ""} />
        </button>

        {/* Quick Investigate Route if active */}
        {hasActiveAlert && (
          <button
            onClick={onQuickInvestigate}
            className="pill-button"
            style={{
              backgroundColor: 'rgba(181, 242, 213, 0.12)',
              color: 'var(--accent-mint)',
              borderColor: 'rgba(181, 242, 213, 0.35)',
            }}
          >
            <Sparkles size={14} />
            <span>Investigate Anomaly</span>
          </button>
        )}

        {/* Demo Controls: Simulate Suspicious Activity / Reset */}
        {isSimulationActive ? (
          <button
            onClick={onResetSimulation}
            disabled={loadingAction}
            className="pill-button pill-secondary"
            style={{
              borderColor: 'rgba(255, 101, 122, 0.4)',
              color: '#FF657A',
            }}
          >
            <RotateCcw size={14} />
            <span>{loadingAction ? 'Resetting...' : 'Reset Simulation'}</span>
          </button>
        ) : (
          <button
            onClick={onStartSimulation}
            disabled={loadingAction}
            className="pill-button pill-critical"
          >
            <Play size={14} fill="currentColor" />
            <span>{loadingAction ? 'Injecting...' : 'Simulate Suspicious Activity'}</span>
          </button>
        )}

      </div>
    </header>
  );
};
