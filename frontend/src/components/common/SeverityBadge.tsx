import React from 'react';
import { Severity } from '../../types';

interface SeverityBadgeProps {
  severity: Severity | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'LOW').toUpperCase();

  const getStyle = () => {
    switch (sev) {
      case 'CRITICAL':
        return {
          bg: 'rgba(255, 101, 122, 0.14)',
          text: '#FF657A',
          border: 'rgba(255, 101, 122, 0.35)',
        };
      case 'HIGH':
        return {
          bg: 'rgba(244, 189, 80, 0.14)',
          text: '#F4BD50',
          border: 'rgba(244, 189, 80, 0.35)',
        };
      case 'MEDIUM':
        return {
          bg: 'rgba(143, 227, 232, 0.12)',
          text: '#8FE3E8',
          border: 'rgba(143, 227, 232, 0.3)',
        };
      case 'LOW':
      default:
        return {
          bg: 'rgba(66, 214, 160, 0.12)',
          text: '#42D6A0',
          border: 'rgba(66, 214, 160, 0.3)',
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className="badge-pill"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontSize: size === 'sm' ? '0.65rem' : '0.72rem',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.2rem 0.65rem',
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: style.text,
          display: 'inline-block',
        }}
      />
      {sev}
    </span>
  );
};
