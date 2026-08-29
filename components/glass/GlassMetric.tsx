import React from 'react';
import { GlassCard } from './GlassCard';

interface GlassMetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'approved' | 'review' | 'unresolved' | 'accent' | 'default';
  className?: string;
}

export const GlassMetric: React.FC<GlassMetricProps> = ({
  label,
  value,
  subtext,
  icon,
  status = 'default',
  className = '',
}) => {
  const statusColors = {
    approved: 'text-status-approved',
    review: 'text-status-review',
    unresolved: 'text-status-unresolved',
    accent: 'text-accent',
    default: 'text-white',
  };

  const statusBorders = {
    approved: 'hover:border-status-approved/40',
    review: 'hover:border-status-review/40',
    unresolved: 'hover:border-status-unresolved/40',
    accent: 'hover:border-accent/40',
    default: 'hover:border-white/20',
  };

  return (
    <GlassCard className={`flex flex-col justify-between ${statusBorders[status]} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-white/50 font-medium font-mono">
          {label}
        </span>
        {icon && <div className="text-white/40">{icon}</div>}
      </div>

      <div>
        <div className={`text-3xl lg:text-4xl font-bold tracking-tight font-mono ${statusColors[status]}`}>
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-white/60 mt-1.5 font-sans flex items-center gap-1.5">
            {subtext}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
