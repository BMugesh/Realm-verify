'use client';

import React from 'react';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ReconciliationMetrics, RunSummary } from '@/lib/types';
import { UploadedSourceSummary } from './CustomDataUpload';
import { formatPaise } from '@/lib/formatters';

interface DarkComparisonCardsProps {
  metrics?: ReconciliationMetrics | null;
  sourceSummary?: UploadedSourceSummary | null;
  runSummary?: RunSummary | null;
  totalRecords?: number;
}

interface MetricItemProps {
  label: string;
  value: string;
  hasBadge?: boolean;
  badgeType?: 'approved' | 'review' | 'unresolved';
}

const MetricItem: React.FC<MetricItemProps> = ({
  label,
  value,
  hasBadge = false,
  badgeType = 'review',
}) => {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-mono text-white/50 uppercase tracking-tight mb-1">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
          {value}
        </span>
        {hasBadge && (
          <div
            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] shrink-0 ${
              badgeType === 'approved'
                ? 'bg-status-approved/20 text-status-approved border border-status-approved/40'
                : badgeType === 'review'
                ? 'bg-status-review/20 text-status-review border border-status-review/40'
                : 'bg-status-unresolved/20 text-status-unresolved border border-status-unresolved/40'
            }`}
          >
            <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
          </div>
        )}
      </div>
    </div>
  );
};

export const DarkComparisonCards: React.FC<DarkComparisonCardsProps> = ({
  metrics,
  sourceSummary,
  runSummary,
  totalRecords = 0,
}) => {
  const hasActiveRun = !!(runSummary || metrics) && totalRecords > 0;

  // 1. Precise real counts from canonical run data
  const autoApprovedCount = hasActiveRun ? (runSummary?.auto_approved_count ?? metrics?.auto_approved_count ?? 0) : 0;
  const needsReviewCount = hasActiveRun ? (runSummary?.needs_review_count ?? metrics?.needs_review_count ?? 0) : 0;
  const unresolvedCount = hasActiveRun ? (runSummary?.unresolved_count ?? metrics?.unresolved_count ?? 0) : 0;
  const totalCount = hasActiveRun ? (runSummary?.total_source_records ?? metrics?.total_source_records ?? totalRecords) : 0;

  const autoRate = hasActiveRun ? (runSummary ? Math.round(runSummary.auto_approval_rate * 100) : (metrics ? Math.round(metrics.auto_approval_rate * 100) : 0)) : 0;
  const exceptionRate = hasActiveRun ? (runSummary ? Math.round(runSummary.exception_rate * 100) : (metrics ? Math.round(metrics.exception_rate * 100) : 0)) : 0;
  const matchRate = hasActiveRun ? (runSummary ? Math.round(runSummary.match_rate * 100) : (metrics ? Math.round((metrics.match_rate ?? 0) * 100) : 0)) : 0;

  // 2. Precise real monetary values from user data
  const reconciledVal = hasActiveRun ? (runSummary?.reconciled_value_formatted ?? metrics?.reconciled_value_formatted ?? '₹0.00') : '₹0.00';
  const unreconciledVal = hasActiveRun ? (runSummary?.unreconciled_value_formatted ?? metrics?.unreconciled_value_formatted ?? '₹0.00') : '₹0.00';
  const openInternalVal = hasActiveRun && needsReviewCount > 0 ? unreconciledVal : '₹0.00';
  const openExternalVal = hasActiveRun && unresolvedCount > 0 ? unreconciledVal : '₹0.00';

  // Real backlog amounts calculated directly from user's data
  const backlogIntVal = hasActiveRun && needsReviewCount > 0 ? openInternalVal : '₹0.00';
  const backlogExtVal = hasActiveRun && unresolvedCount > 0 ? openExternalVal : '₹0.00';

  // 3. Dynamic bar heights (clamped 0 to 100%)
  const todayBarInternal = hasActiveRun ? Math.max(3, exceptionRate) : 0;
  const todayBarExternal = hasActiveRun ? Math.max(3, 100 - matchRate) : 0;
  const todayBarReconcile = hasActiveRun ? Math.max(5, autoRate) : 0;

  const backlogBarInternal = hasActiveRun && exceptionRate > 0 ? Math.max(8, exceptionRate) : 0;
  const backlogBarReconcile = hasActiveRun && exceptionRate > 0 ? Math.max(5, 100 - exceptionRate) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ============================================================ */}
      {/* CARD 1: TODAY / ACTIVE RUN BATCH                            */}
      {/* ============================================================ */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-white/10 shadow-glass-card flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/05 blur-3xl pointer-events-none" />

        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold font-mono text-white tracking-tight">
              Today
            </h3>
            <span className="text-xs font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
              {hasActiveRun ? `${matchRate}% Match Consensus` : '0% · Awaiting Ingestion'}
            </span>
          </div>

          {/* 6 Metrics Grid (3 cols x 2 rows) - 100% computed from User Data */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-4 mb-8">
            <MetricItem label="Reconciled" value={reconciledVal} />
            <MetricItem label="Open Internal" value={openInternalVal} hasBadge={needsReviewCount > 0} badgeType="review" />
            <MetricItem label="Open External" value={openExternalVal} hasBadge={unresolvedCount > 0} badgeType="review" />

            <MetricItem
              label="Reconciled"
              value={autoApprovedCount.toLocaleString()}
              hasBadge={autoApprovedCount > 0}
              badgeType="approved"
            />
            <MetricItem
              label="Open Int Count"
              value={needsReviewCount.toLocaleString()}
              hasBadge={needsReviewCount > 0}
              badgeType="review"
            />
            <MetricItem
              label="Open External"
              value={unresolvedCount.toLocaleString()}
              hasBadge={unresolvedCount > 0}
              badgeType="review"
            />
          </div>
        </div>

        {/* Chart Section */}
        <div className="pt-2 border-t border-white/05">
          {/* Title */}
          <div className="text-center text-xs font-mono text-white/70 mb-3">
            Today's Trend
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 text-xs text-white/60 mb-5 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#818CF8]" />
              <span className="text-[11px]">open internal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FB923C]" />
              <span className="text-[11px]">open external</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#15BCDF]" />
              <span className="text-[11px]">Reconcile</span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative h-44 w-full flex items-end">
            {/* Y-Axis Grid Lines & Labels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-white/30 font-mono">
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">100%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">75%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">50%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">25%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">0%</span>
                <div className="flex-1 border-b border-white/10" />
              </div>
            </div>

            {/* Bars */}
            <div className="ml-8 w-full h-full flex items-end justify-center pb-0 z-10">
              <div className="flex items-end justify-center gap-3 sm:gap-5 h-full pb-1">
                {/* Purple Bar: Open Internal */}
                <div
                  className="w-7 sm:w-10 bg-[#818CF8] rounded-t-md transition-all duration-700 hover:opacity-90 hover:scale-105 shadow-sm"
                  style={{ height: `${todayBarInternal}%` }}
                  title={`Open Internal Exception: ${exceptionRate}%`}
                />

                {/* Orange Bar: Open External */}
                <div
                  className="w-7 sm:w-10 bg-[#FB923C] rounded-t-md transition-all duration-700 hover:opacity-90 hover:scale-105 shadow-sm"
                  style={{ height: `${todayBarExternal}%` }}
                  title={`Open External Unmatched: ${100 - matchRate}%`}
                />

                {/* Cyan Bar: Reconcile */}
                <div
                  className="w-7 sm:w-10 bg-[#15BCDF] rounded-t-md transition-all duration-700 hover:opacity-90 hover:scale-105 shadow-glow-sm"
                  style={{ height: `${todayBarReconcile}%` }}
                  title={`Reconciled Approved: ${autoRate}%`}
                />
              </div>
            </div>
          </div>

          {/* X-Axis Label */}
          <div className="text-center text-[11px] font-mono text-white/40 mt-2">
            Today
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD 2: BACKLOG / EXCEPTION POOL                             */}
      {/* ============================================================ */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-white/10 shadow-glass-card flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#6366F1]/05 blur-3xl pointer-events-none" />

        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold font-mono text-white tracking-tight">
              Backlog
            </h3>
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                exceptionRate === 0
                  ? 'text-status-approved bg-status-approved/10 border-status-approved/20'
                  : 'text-status-review bg-status-review/10 border-status-review/20'
              }`}
            >
              {exceptionRate === 0 ? '0 Exceptions · Fully Balanced' : `${exceptionRate}% Exception Queue`}
            </span>
          </div>

          {/* 6 Metrics Grid (3 cols x 2 rows) - 100% computed from User Data */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-4 mb-8">
            <MetricItem label="Reconciled" value={unreconciledVal} hasBadge badgeType="review" />
            <MetricItem label="Open Int Amount" value={backlogIntVal} hasBadge badgeType="review" />
            <MetricItem label="Open Ext Amount" value={backlogExtVal} hasBadge badgeType="review" />

            <MetricItem
              label="Reconciled"
              value={(needsReviewCount + unresolvedCount).toLocaleString()}
              hasBadge
              badgeType="review"
            />
            <MetricItem
              label="Open Int Count"
              value={needsReviewCount.toLocaleString()}
              hasBadge
              badgeType="review"
            />
            <MetricItem
              label="Open Ext Count"
              value={unresolvedCount.toLocaleString()}
              hasBadge
              badgeType="review"
            />
          </div>
        </div>

        {/* Chart Section */}
        <div className="pt-2 border-t border-white/05">
          {/* Title */}
          <div className="text-center text-xs font-mono text-white/70 mb-3">
            Backlog's Trend
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 text-xs text-white/60 mb-5 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#818CF8]" />
              <span className="text-[11px]">open internal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#15BCDF]" />
              <span className="text-[11px]">Reconcile</span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative h-44 w-full flex items-end">
            {/* Y-Axis Grid Lines & Labels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-white/30 font-mono">
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">100%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">75%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">50%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">25%</span>
                <div className="flex-1 border-b border-white/[0.04]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">0%</span>
                <div className="flex-1 border-b border-white/10" />
              </div>
            </div>

            {/* Bars */}
            <div className="ml-8 w-full h-full flex items-end justify-center pb-0 z-10">
              <div className="flex items-end justify-center gap-4 sm:gap-6 h-full pb-1">
                {/* Purple Bar: Open Internal */}
                <div
                  className="w-8 sm:w-12 bg-[#818CF8] rounded-t-md transition-all duration-700 hover:opacity-90 hover:scale-105 shadow-sm"
                  style={{ height: `${backlogBarInternal}%` }}
                  title={`Backlog Exceptions: ${exceptionRate}%`}
                />

                {/* Cyan Bar: Reconcile */}
                <div
                  className="w-8 sm:w-12 bg-[#15BCDF] rounded-t-md transition-all duration-700 hover:opacity-90 hover:scale-105 shadow-glow-sm"
                  style={{ height: `${backlogBarReconcile}%` }}
                  title={`Backlog Resolved: ${100 - exceptionRate}%`}
                />
              </div>
            </div>
          </div>

          {/* X-Axis Label */}
          <div className="text-center text-[11px] font-mono text-white/40 mt-2">
            Today
          </div>
        </div>
      </div>
    </div>
  );
};
