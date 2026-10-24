import React from 'react';
import {
  Shield,
  LayoutDashboard,
  HardDrive,
  AlertTriangle,
  FileSearch,
  Play,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { ActivePage } from '../../types';

interface FloatingNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isSimulationActive: boolean;
  isBackendOnline: boolean;
  criticalAlertCount: number;
  onStartSimulation: () => void;
  onResetSimulation: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  loadingAction: boolean;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activePage,
  onNavigate,
  isSimulationActive,
  isBackendOnline,
  criticalAlertCount,
  onStartSimulation,
  onResetSimulation,
  onRefresh,
  isRefreshing,
  loadingAction,
}) => {
  const navItems = [
    { id: 'overview' as ActivePage, label: 'Overview', icon: LayoutDashboard },
    { id: 'devices' as ActivePage, label: 'Devices', icon: HardDrive },
    {
      id: 'alerts' as ActivePage,
      label: 'Alerts',
      icon: AlertTriangle,
      badge: criticalAlertCount > 0 ? String(criticalAlertCount) : undefined,
    },
    { id: 'investigation' as ActivePage, label: 'Investigation', icon: FileSearch },
  ];

  return (
    <nav className="floating-nav">
      {/* Left: Brand */}
      <div className="brand" onClick={() => onNavigate('overview')}>
        <div className="brand-icon">
          <Shield size={15} color="var(--accent-mint)" />
        </div>
        <span className="brand-name">Anomaly Spotter</span>
      </div>

      {/* Center: Navigation pill group */}
      <div className="nav-pill-group">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || (item.id === 'devices' && activePage === 'device-detail');

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-pill-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="nav-pill-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Status & controls */}
      <div className="nav-right-controls">
        {/* Status indicator */}
        <div className={`status-indicator ${isSimulationActive ? 'critical' : 'nominal'}`}>
          <span
            className="status-dot"
            style={{ backgroundColor: isSimulationActive ? 'var(--status-critical)' : 'var(--status-healthy)' }}
          />
          <span>{isSimulationActive ? 'CRITICAL' : 'NOMINAL'}</span>
        </div>

        {/* Backend status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.65rem',
            color: isBackendOnline ? 'var(--status-healthy)' : 'var(--status-warning)',
            opacity: 0.7,
          }}
        >
          <span
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? 'var(--status-healthy)' : 'var(--status-warning)',
            }}
          />
          <span>{isBackendOnline ? 'API' : 'Fixture'}</span>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.3rem',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '6px',
            transition: 'color 0.2s',
          }}
          title="Refresh telemetry"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin-slow' : ''} />
        </button>

        {/* Simulation control (compact) */}
        {isSimulationActive ? (
          <button
            onClick={onResetSimulation}
            disabled={loadingAction}
            className="pill-button"
            style={{
              padding: '0.3rem 0.7rem',
              fontSize: '0.7rem',
              background: 'rgba(255, 113, 132, 0.1)',
              color: 'var(--status-critical)',
              borderColor: 'rgba(255, 113, 132, 0.3)',
            }}
          >
            <RotateCcw size={11} />
            <span>{loadingAction ? '...' : 'Reset'}</span>
          </button>
        ) : (
          <button
            onClick={onStartSimulation}
            disabled={loadingAction}
            className="pill-button pill-ghost"
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.7rem' }}
          >
            <Play size={11} fill="currentColor" />
            <span>{loadingAction ? '...' : 'Simulate'}</span>
          </button>
        )}
      </div>
    </nav>
  );
};
