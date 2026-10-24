import React from 'react';
import {
  Shield,
  LayoutDashboard,
  HardDrive,
  AlertTriangle,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Wifi
} from 'lucide-react';
import { ActivePage } from '../../types';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  criticalAlertCount: number;
  isBackendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  criticalAlertCount,
  isBackendOnline,
}) => {
  const navItems = [
    { id: 'overview' as ActivePage, label: 'Network Overview', icon: LayoutDashboard },
    { id: 'devices' as ActivePage, label: 'Monitored Devices', icon: HardDrive },
    {
      id: 'alerts' as ActivePage,
      label: 'Security Alerts',
      icon: AlertTriangle,
      badge: criticalAlertCount > 0 ? String(criticalAlertCount) : undefined
    },
    { id: 'investigation' as ActivePage, label: 'Investigation Workspace', icon: FileSearch },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Top Brand Header */}
      <div>
        <div
          style={{
            padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.4rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
            }}
            onClick={() => onNavigate('overview')}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(181, 242, 213, 0.15), rgba(143, 227, 232, 0.15))',
                border: '1px solid rgba(181, 242, 213, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield size={18} color="var(--accent-mint)" />
            </div>

            {!collapsed && (
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Anomaly Spotter
                </h1>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  SOC Platform
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '6px',
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id || (item.id === 'devices' && activePage === 'device-detail');

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: collapsed ? '0.65rem 0' : '0.65rem 0.85rem',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '8px',
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  border: isActive ? '1px solid rgba(181, 242, 213, 0.25)' : '1px solid transparent',
                  color: isActive ? 'var(--accent-mint)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  width: '100%',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} color={isActive ? 'var(--accent-mint)' : 'currentColor'} />

                {!collapsed && (
                  <span style={{ whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge && (
                  <span
                    style={{
                      backgroundColor: 'rgba(255, 101, 122, 0.2)',
                      color: '#FF657A',
                      border: '1px solid rgba(255, 101, 122, 0.4)',
                      borderRadius: '9999px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Information Section */}
      {!collapsed ? (
        <div
          style={{
            padding: '1rem',
            margin: '0.75rem',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '0.74rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
            <Cpu size={14} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>System Intelligence</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subnet</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>192.168.1.0/24</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Endpoints</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>42 Monitored</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>API Server</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isBackendOnline ? '#42D6A0' : '#F4BD50' }}>
                <Wifi size={11} />
                {isBackendOnline ? '8000 Live' : 'Demo Fixtures'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? '#42D6A0' : '#F4BD50',
            }}
            title={isBackendOnline ? 'Backend Online' : 'Fixture Mode'}
          />
        </div>
      )}
    </aside>
  );
};
