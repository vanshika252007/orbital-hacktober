import React, { useState } from 'react';
import { Network, ExternalLink } from 'lucide-react';
import { DeviceListItem } from '../../types';

interface NetworkTopologyProps {
  devices: DeviceListItem[];
  isSimulationActive: boolean;
  onSelectDevice: (deviceId: string) => void;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  devices: _devices,
  isSimulationActive,
  onSelectDevice,
}) => {
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);

  // SVG Dimensions & center
  const width = 760;
  const height = 380;
  const cx = width / 2;
  const cy = height / 2;

  // Key nodes mapped onto visual layout
  // Center is Gateway
  const topologyNodes = [
    // Core Server ring (Radius ~90)
    { id: '192.168.1.1', name: 'Domain-Controller', type: 'Server', angle: 45, r: 85 },
    { id: '192.168.1.2', name: 'File-Server-01', type: 'Server', angle: 135, r: 85 },
    { id: '192.168.1.5', name: 'Database-Master', type: 'Server', angle: 225, r: 85 },
    { id: '192.168.1.6', name: 'Web-Proxy', type: 'Server', angle: 315, r: 85 },

    // Workstation ring (Radius ~150)
    { id: '192.168.1.10', name: 'Admin-Workstation', type: 'Workstation', angle: 20, r: 155 },
    { id: '192.168.1.11', name: 'Developer-MacBook', type: 'Workstation', angle: 80, r: 155 },
    { id: '192.168.1.12', name: 'Finance-Desktop', type: 'Workstation', angle: 190, r: 155 },
    { id: '192.168.1.23', name: 'Student-Laptop', type: 'Workstation', angle: 330, r: 155, isHero: true },

    // IoT / Edge ring (Radius ~200)
    { id: '192.168.1.100', name: 'Camera-Lobby', type: 'IoT', angle: 110, r: 215 },
    { id: '192.168.1.106', name: 'Access-Badge-Reader', type: 'IoT', angle: 250, r: 215 },
    { id: '192.168.1.50', name: 'Guest-Phone-01', type: 'Mobile', angle: 290, r: 215 },
  ];

  return (
    <div className="card" style={{ padding: '1.4rem', overflow: 'hidden' }}>
      
      {/* Topology Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={16} color="var(--accent-mint)" />
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Subnet Topology & Connected Endpoint Geometry
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Geometric node representation of active /24 subnet telemetry relationships
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#42D6A0' }} />
            <span>Nominal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF657A', boxShadow: '0 0 6px rgba(255,101,122,0.6)' }} />
            <span>Suspicious Node</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: 'relative', width: '100%', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', maxHeight: '340px' }}
        >
          <defs>
            {/* Luminous gradients */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#B5F2D5" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#080B0D" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="anomalyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF657A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FF657A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Center ambient glow */}
          <circle cx={cx} cy={cy} r="180" fill="url(#centerGlow)" />

          {/* Delicate Concentric Orbital Rings */}
          <circle cx={cx} cy={cy} r="85" fill="none" stroke="#283932" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <circle cx={cx} cy={cy} r="155" fill="none" stroke="#283932" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          <circle cx={cx} cy={cy} r="215" fill="none" stroke="#283932" strokeWidth="1" strokeDasharray="5 5" opacity="0.35" />

          {/* Connecting lines between Center Gateway and Nodes */}
          {topologyNodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const nx = cx + node.r * Math.cos(rad);
            const ny = cy + node.r * Math.sin(rad);
            const isSuspicious = node.isHero && isSimulationActive;

            // Curved quadratic bezier path for minimal futuristic elegance
            const mx = (cx + nx) / 2 + (node.angle > 180 ? -12 : 12);
            const my = (cy + ny) / 2 + (node.angle > 90 && node.angle < 270 ? 12 : -12);

            return (
              <g key={`path-${node.id}`}>
                <path
                  d={`M ${cx} ${cy} Q ${mx} ${my} ${nx} ${ny}`}
                  fill="none"
                  stroke={isSuspicious ? '#FF657A' : '#283932'}
                  strokeWidth={isSuspicious ? '2' : '1'}
                  opacity={isSuspicious ? '0.85' : '0.55'}
                  style={{
                    transition: 'stroke 0.4s ease, stroke-width 0.4s ease',
                  }}
                />
                {isSuspicious && (
                  <path
                    d={`M ${cx} ${cy} Q ${mx} ${my} ${nx} ${ny}`}
                    fill="none"
                    stroke="#FF657A"
                    strokeWidth="4"
                    opacity="0.25"
                  />
                )}
              </g>
            );
          })}

          {/* Center Gateway Node */}
          <circle cx={cx} cy={cy} r="14" fill="#111816" stroke="#B5F2D5" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="6" fill="#B5F2D5" />
          <text
            x={cx}
            y={cy + 24}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            Subnet Gateway (192.168.1.1)
          </text>

          {/* Endpoint Nodes */}
          {topologyNodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const nx = cx + node.r * Math.cos(rad);
            const ny = cy + node.r * Math.sin(rad);
            const isSuspicious = node.isHero && isSimulationActive;

            return (
              <g
                key={`node-${node.id}`}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectDevice(node.id)}
                onMouseEnter={() => setHoveredNode({ ...node, x: nx, y: ny })}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Aura for suspicious node */}
                {isSuspicious && (
                  <circle
                    cx={nx}
                    cy={ny}
                    r="20"
                    fill="url(#anomalyGlow)"
                    className="animate-pulse-subtle"
                  />
                )}

                {/* Node outer ring */}
                <circle
                  cx={nx}
                  cy={ny}
                  r={isSuspicious ? 10 : 7}
                  fill="#111816"
                  stroke={isSuspicious ? '#FF657A' : (node.type === 'Server' ? '#8FE3E8' : '#42D6A0')}
                  strokeWidth={isSuspicious ? 2 : 1.5}
                  style={{ transition: 'all 0.3s ease' }}
                />

                {/* Node inner dot */}
                <circle
                  cx={nx}
                  cy={ny}
                  r={isSuspicious ? 4 : 2.5}
                  fill={isSuspicious ? '#FF657A' : (node.type === 'Server' ? '#8FE3E8' : '#42D6A0')}
                />

                {/* Node label */}
                <text
                  x={nx}
                  y={ny - 12}
                  textAnchor="middle"
                  fill={isSuspicious ? '#FF657A' : 'var(--text-muted)'}
                  fontSize="9.5"
                  fontWeight={isSuspicious ? '700' : '500'}
                  fontFamily="var(--font-display)"
                >
                  {node.name}
                </text>

                {isSuspicious && (
                  <text
                    x={nx}
                    y={ny + 20}
                    textAnchor="middle"
                    fill="#FF657A"
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                  >
                    [94 / CRITICAL]
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredNode.x / width) * 100}%`,
              top: `${(hoveredNode.y / height) * 100}%`,
              transform: 'translate(-50%, -125%)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              fontSize: '0.74rem',
              color: 'var(--text-primary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
              zIndex: 20,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 600, color: hoveredNode.isHero && isSimulationActive ? '#FF657A' : 'var(--accent-mint)' }}>
              {hoveredNode.name}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {hoveredNode.id} &bull; {hoveredNode.type}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>Click to view telemetry</span>
              <ExternalLink size={10} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
