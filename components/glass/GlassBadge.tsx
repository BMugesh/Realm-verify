import React from 'react';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'approved' | 'review' | 'unresolved' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-white/10 text-white/90 border-white/15',
    accent: 'bg-accent/15 text-accent border-accent/30',
    approved: 'bg-status-approvedBg text-status-approved border-status-approvedBorder',
    review: 'bg-status-reviewBg text-status-review border-status-reviewBorder',
    unresolved: 'bg-status-unresolvedBg text-status-unresolved border-status-unresolvedBorder',
    neutral: 'bg-white/5 text-white/60 border-white/10',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded-md border font-medium ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
