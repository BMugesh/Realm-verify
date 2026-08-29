import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glow';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hoverEffect = true,
  ...props
}) => {
  const variantStyles = {
    default: 'glass-card',
    elevated: 'glass-panel',
    glow: 'glass-card border-accent/30 shadow-glow-sm',
  };

  return (
    <div
      className={`rounded-2xl p-6 relative overflow-hidden ${variantStyles[variant]} ${
        hoverEffect ? 'hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {/* Subtle top inner border highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
