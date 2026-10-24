import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'healthy' | 'warning' | 'critical';
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  badge,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return {
          border: 'rgba(255, 101, 122, 0.35)',
          glow: '0 0 20px rgba(255, 101, 122, 0.1)',
          textColor: '#FF657A',
          iconBg: 'rgba(255, 101, 122, 0.15)',
        };
      case 'warning':
        return {
          border: 'rgba(244, 189, 80, 0.3)',
          glow: '0 0 15px rgba(244, 189, 80, 0.08)',
          textColor: '#F4BD50',
          iconBg: 'rgba(244, 189, 80, 0.12)',
        };
      case 'healthy':
        return {
          border: 'rgba(66, 214, 160, 0.25)',
          glow: '0 0 15px rgba(66, 214, 160, 0.08)',
          textColor: '#42D6A0',
          iconBg: 'rgba(66, 214, 160, 0.12)',
        };
      default:
        return {
          border: 'var(--border)',
          glow: 'none',
          textColor: 'var(--text-primary)',
          iconBg: 'rgba(255, 255, 255, 0.04)',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem 1.4rem',
        borderColor: styles.border,
        boxShadow: styles.glow,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: styles.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color={styles.textColor} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: styles.textColor,
          }}
        >
          {value}
        </span>
        {badge && (
          <span className={`badge-pill badge-${variant === 'default' ? 'mint' : variant}`} style={{ fontSize: '0.68rem' }}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
          {subtext}
        </span>
      )}
    </div>
  );
};
