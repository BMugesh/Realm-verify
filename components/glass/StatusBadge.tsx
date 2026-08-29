import React from 'react';
import { DecisionStatus } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: DecisionStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const normStatus = (status || '').toUpperCase();

  if (normStatus === 'AUTO_APPROVED' || normStatus === 'APPROVED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-status-approvedBg text-status-approved border border-status-approvedBorder ${className}`}
      >
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5" />}
        <span>AUTO_APPROVED</span>
      </span>
    );
  }

  if (normStatus === 'NEEDS_REVIEW' || normStatus === 'REVIEW') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-status-reviewBg text-status-review border border-status-reviewBorder ${className}`}
      >
        {showIcon && <AlertTriangle className="w-3.5 h-3.5" />}
        <span>NEEDS_REVIEW</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-status-unresolvedBg text-status-unresolved border border-status-unresolvedBorder ${className}`}
    >
      {showIcon && <XCircle className="w-3.5 h-3.5" />}
      <span>UNRESOLVED</span>
    </span>
  );
};
