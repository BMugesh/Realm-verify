'use client';

import React from 'react';
import { Database, CreditCard, Building2, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassBadge } from '../glass/GlassBadge';

interface LedgerFlowGraphProps {
  flowData?: {
    internal_transactions: { count: number; gross_formatted: string };
    gateway_payouts: { count: number; gross_formatted: string; fees_formatted: string; net_formatted: string };
    bank_credits: { count: number; credit_formatted: string };
    matched_reconciled: { count: number; percentage: number; reconciled_val: string };
    flagged_exceptions: { count: number; percentage: number; unreconciled_val: string };
  };
}

export const LedgerFlowGraph: React.FC<LedgerFlowGraphProps> = ({ flowData }) => {
  const data = flowData || {
    internal_transactions: { count: 500, gross_formatted: '₹6,84,200.00' },
    gateway_payouts: {
      count: 369,
      gross_formatted: '₹6,84,200.00',
      fees_formatted: '₹13,680.00',
      net_formatted: '₹6,70,520.00',
    },
    bank_credits: { count: 397, credit_formatted: '₹6,70,520.00' },
    matched_reconciled: { count: 271, percentage: 73.6, reconciled_val: '₹3,45,860.20' },
    flagged_exceptions: { count: 98, percentage: 26.4, unreconciled_val: '₹1,96,926.40' },
  };

  return (
    <GlassCard variant="elevated" className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="text-xs font-mono uppercase text-accent mb-1">
            3-WAY MULTI-LEDGER SETTLEMENT FLOW
          </div>
          <h3 className="text-xl font-bold font-mono text-white uppercase">
            Sankey Settlement Pipeline
          </h3>
        </div>
        <GlassBadge variant="approved" size="sm">
          0 PAISE CONSERVATION OF VALUE
        </GlassBadge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative items-center">
        {/* Tier 1: Internal Ledger */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <Database className="w-5 h-5 text-white/70" />
            <span className="text-[10px] font-mono text-white/40">TIER 1 (CORE)</span>
          </div>
          <div>
            <div className="text-xs font-mono text-white/50">Internal Ledger</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {data.internal_transactions.count} Txns
            </div>
            <div className="text-xs font-mono text-accent mt-1">
              Gross: {data.internal_transactions.gross_formatted}
            </div>
          </div>
          <div className="text-[10px] font-mono text-white/40 pt-2 border-t border-white/10">
            Source of customer truth
          </div>
        </div>

        {/* Tier 2: Gateway Payouts */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-accent/20 flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <CreditCard className="w-5 h-5 text-accent" />
            <span className="text-[10px] font-mono text-accent font-semibold">TIER 2 (GATEWAY)</span>
          </div>
          <div>
            <div className="text-xs font-mono text-white/50">Gateway Payouts</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {data.gateway_payouts.count} Batches
            </div>
            <div className="text-xs font-mono text-status-review mt-1">
              Fees: {data.gateway_payouts.fees_formatted}
            </div>
          </div>
          <div className="text-[10px] font-mono text-accent pt-2 border-t border-white/10">
            Net: {data.gateway_payouts.net_formatted}
          </div>
        </div>

        {/* Tier 3: Bank Feed */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <Building2 className="w-5 h-5 text-white/70" />
            <span className="text-[10px] font-mono text-white/40">TIER 3 (BANK)</span>
          </div>
          <div>
            <div className="text-xs font-mono text-white/50">Bank Statement Feed</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {data.bank_credits.count} Credits
            </div>
            <div className="text-xs font-mono text-status-approved mt-1">
              Received: {data.bank_credits.credit_formatted}
            </div>
          </div>
          <div className="text-[10px] font-mono text-white/40 pt-2 border-t border-white/10">
            Realized cash liquidity
          </div>
        </div>

        {/* Tier 4: Realm Verify Consensus */}
        <div className="p-5 rounded-2xl bg-status-approvedBg border border-status-approvedBorder flex flex-col justify-between h-[180px] shadow-glow-sm">
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-status-approved" />
            <span className="text-[10px] font-mono text-status-approved font-bold">5-AGENT CONSENSUS</span>
          </div>
          <div>
            <div className="text-xs font-mono text-status-approved">Reconciled Value</div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {data.matched_reconciled.reconciled_val}
            </div>
            <div className="text-xs font-mono text-status-approved font-semibold mt-1">
              {data.matched_reconciled.percentage}% Auto-Approved
            </div>
          </div>
          <div className="text-[10px] font-mono text-white/60 pt-2 border-t border-status-approvedBorder">
            Zero False Commits (0.00%)
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
