import React from 'react';

interface RiskMeterProps {
  score: number;
  showLabel?: boolean;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ score, showLabel = true }) => {
  const normalized = Math.min(Math.max(score || 0, 0), 100);

  const getColor = () => {
    if (normalized >= 75) return '#FF657A';
    if (normalized >= 40) return '#F4BD50';
    return '#42D6A0';
  };

  const color = getColor();

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Risk Index</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: color,
            }}
          >
            {normalized.toFixed(0)}/100
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '5px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${normalized}%`,
            backgroundColor: color,
            borderRadius: '9999px',
            transition: 'width 0.4s ease',
            boxShadow: normalized >= 75 ? '0 0 8px rgba(255, 101, 122, 0.5)' : 'none',
          }}
        />
      </div>
    </div>
  );
};
