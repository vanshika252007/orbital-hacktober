import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { NetworkStats, DeviceListItem } from '../../types';

interface CinematicHeroProps {
  stats: NetworkStats;
  devices: DeviceListItem[];
  isSimulationActive: boolean;
  onOpenInvestigation: (alertId: string) => void;
  onNavigateDevices: () => void;
  onSelectDevice: (deviceId: string) => void;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
  stats,
  isSimulationActive,
  onOpenInvestigation,
  onNavigateDevices,
  onSelectDevice,
}) => {
  const endpointCount = stats.total_devices || 42;

  // Network node positions for the peripheral labels
  const networkLabels = [
    { name: 'Student-Laptop', ip: '192.168.1.23', top: '22%', left: '6%', critical: true, deviceId: '192.168.1.23' },
    { name: 'Database-Master', ip: '192.168.1.5', top: '42%', left: '3%', critical: false, deviceId: '192.168.1.5' },
    { name: 'Domain-Controller', ip: '192.168.1.1', top: '68%', left: '7%', critical: false, deviceId: '192.168.1.1' },
    { name: 'Web-Proxy', ip: '192.168.1.6', top: '25%', right: '5%', critical: false, deviceId: '192.168.1.6' },
    { name: 'Finance-Desktop', ip: '192.168.1.12', top: '50%', right: '3%', critical: false, deviceId: '192.168.1.12' },
    { name: 'Admin-Workstation', ip: '192.168.1.10', top: '72%', right: '6%', critical: false, deviceId: '192.168.1.10' },
  ];

  return (
    <section className="hero-canvas">
      {/* Network geometry SVG layer */}
      <div className="hero-network-layer">
        <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="lineGradL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="#28312B" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#28312B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="lineGradR" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="#28312B" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#28312B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="critLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="#FF7184" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#FF7184" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Left-side network paths - gentle curves entering from left */}
          <path
            d="M 0 160 Q 200 170 400 280 Q 500 330 600 350"
            fill="none"
            stroke={isSimulationActive ? 'url(#critLine)' : 'url(#lineGradL)'}
            strokeWidth="1"
          />
          <path
            d="M 0 310 Q 150 300 350 330 Q 480 350 600 350"
            fill="none"
            stroke="url(#lineGradL)"
            strokeWidth="0.8"
          />
          <path
            d="M 0 480 Q 200 470 380 400 Q 500 360 600 350"
            fill="none"
            stroke="url(#lineGradL)"
            strokeWidth="0.8"
          />

          {/* Right-side network paths - gentle curves entering from right */}
          <path
            d="M 1200 180 Q 1000 190 800 280 Q 700 320 600 350"
            fill="none"
            stroke="url(#lineGradR)"
            strokeWidth="0.8"
          />
          <path
            d="M 1200 370 Q 1050 360 850 340 Q 720 330 600 350"
            fill="none"
            stroke="url(#lineGradR)"
            strokeWidth="0.8"
          />
          <path
            d="M 1200 520 Q 1000 500 820 420 Q 700 370 600 350"
            fill="none"
            stroke="url(#lineGradR)"
            strokeWidth="0.8"
          />

          {/* Small endpoint dots along the lines (left side) */}
          <circle cx="120" cy="165" r="2.5" fill={isSimulationActive ? '#FF7184' : '#748078'} opacity="0.7">
            {isSimulationActive && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />}
          </circle>
          <circle cx="180" cy="305" r="2" fill="#748078" opacity="0.5" />
          <circle cx="140" cy="475" r="2" fill="#748078" opacity="0.5" />

          {/* Small endpoint dots (right side) */}
          <circle cx="1080" cy="185" r="2" fill="#748078" opacity="0.5" />
          <circle cx="1050" cy="365" r="2" fill="#748078" opacity="0.5" />
          <circle cx="1060" cy="510" r="2" fill="#748078" opacity="0.5" />

          {/* Central convergence node */}
          <circle cx="600" cy="350" r="4" fill="#111613" stroke="#28312B" strokeWidth="1" />
          <circle cx="600" cy="350" r="1.5" fill="var(--accent-mint)" opacity="0.5" />
        </svg>
      </div>

      {/* Peripheral network device labels */}
      {networkLabels.map((label) => (
        <div
          key={label.name}
          className={`network-label ${label.critical && isSimulationActive ? 'critical' : ''}`}
          style={{
            top: label.top,
            left: label.left,
            right: label.right,
          }}
          onClick={() => onSelectDevice(label.deviceId)}
          title={`${label.name} (${label.ip}) — Click to inspect`}
        >
          <span className="node-dot" />
          <span>{label.name}</span>
        </div>
      ))}

      {/* Central hero content */}
      <div className="hero-content">
        <div className="hero-eyebrow">
          SOC BEHAVIORAL DEFENSE · {endpointCount} ENDPOINTS
        </div>

        <h1 className="hero-headline">
          See what shouldn't
          <br />
          be happening.
        </h1>

        <p className="hero-description">
          Understand unusual network behavior. Follow the evidence.
          <br />
          Investigate with confidence.
        </p>

        <div className="hero-actions">
          {isSimulationActive ? (
            <button
              onClick={() => onOpenInvestigation('alert_hero_001')}
              className="pill-button pill-primary"
              style={{ padding: '0.55rem 1.35rem' }}
            >
              <Sparkles size={15} />
              <span>Open Investigation</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenInvestigation('alert_hero_001')}
              className="pill-button pill-primary"
              style={{ padding: '0.55rem 1.35rem' }}
            >
              <Sparkles size={15} />
              <span>Open Investigation</span>
            </button>
          )}

          <button
            onClick={onNavigateDevices}
            className="pill-button pill-ghost"
            style={{ padding: '0.55rem 1.35rem' }}
          >
            <span>Explore Network</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Discreet monitoring state summary */}
        {isSimulationActive && (
          <div
            style={{
              marginTop: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.72rem',
              color: 'var(--status-critical)',
              opacity: 0.8,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-critical)',
                boxShadow: '0 0 8px rgba(255, 113, 132, 0.5)',
              }}
              className="animate-pulse-subtle"
            />
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              Student-Laptop · 192.168.1.23 · Risk 94/100 · Active Incident
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
