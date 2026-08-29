'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Play,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassBadge } from '@/components/glass/GlassBadge';
import { GlassCard } from '@/components/glass/GlassCard';
import { ReconciledBalanceCard } from '@/components/dashboard/ReconciledBalanceCard';
import { ConcentricAnomalyArcs } from '@/components/dashboard/ConcentricAnomalyArcs';
import { NodalGatewayCard } from '@/components/dashboard/NodalGatewayCard';
import { MultiLedgerVolumeChart } from '@/components/dashboard/MultiLedgerVolumeChart';
import { SettlementHeatmapMatrix } from '@/components/dashboard/SettlementHeatmapMatrix';
import { LiveSettlementFeed } from '@/components/dashboard/LiveSettlementFeed';
import { ExplainModal } from '@/components/explainability/ExplainModal';
import { useCurrentRun } from '@/lib/RunContext';
import { api } from '@/lib/api';
import { DecisionExplanation } from '@/lib/types';

export default function DashboardPage() {
  const { currentRun, isLoading, error, hasRunLoaded, refreshCurrentRun, executeSyntheticRun } = useCurrentRun();
  const [selectedExplanation, setSelectedExplanation] = useState<DecisionExplanation | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const handleSelectSettlement = async (settlementId: string) => {
    try {
      const expl = await api.explainDecision(settlementId);
      setSelectedExplanation(expl);
    } catch (err) {
      console.error('Explain fetch error:', err);
    }
  };

  const handleSeedBenchmark = async () => {
    setIsSeeding(true);
    try {
      await executeSyntheticRun(42, 500);
    } catch (err) {
      console.error('Seeding failed:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const totalRecords = currentRun?.total_source_records ?? 0;
  const reconciledVal = currentRun?.reconciled_value_formatted ?? '₹ 0.00';
  const totalClearedArc = currentRun?.reconciled_value_formatted ? currentRun.reconciled_value_formatted.split('.')[0] : '₹ 0';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>OPERATIONS CONTROL ROOM · 5-AGENT MULTI-LEDGER TELEMETRY</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
            Executive Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1">
            {currentRun
              ? `Live Telemetry from ${currentRun.pipeline_type} (Run: ${currentRun.run_id} · Dataset: ${currentRun.dataset_name})`
              : 'Real-time multi-ledger flow across Internal Transactions, Gateway Settlements, and Bank Statements.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlassButton
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={refreshCurrentRun}
          >
            Refresh
          </GlassButton>

          <Link href="/reconciliation">
            <GlassButton size="sm" variant="primary" icon={<Play className="w-3.5 h-3.5 fill-current" />}>
              Ingest & Reconcile
            </GlassButton>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-unresolved/20 border border-status-unresolved/40 text-status-unresolved text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleSeedBenchmark}
            disabled={isSeeding}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-mono font-bold text-white transition-colors"
          >
            {isSeeding ? 'Loading Benchmark...' : 'Load Seed 42 Batch'}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* EMPTY STATE (WHEN NO RUN IS LOADED)                          */}
      {/* ============================================================ */}
      {!hasRunLoaded && !isLoading ? (
        <GlassCard variant="elevated" className="p-8 sm:p-12 text-center my-8 border-accent/30">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4 text-accent shadow-glow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-mono text-white mb-2 uppercase">
            No Active Reconciliation Run Loaded
          </h2>
          <p className="text-sm text-white/70 max-w-xl mx-auto mb-6 font-sans">
            To view live multi-ledger telemetry, upload your multi-source financial exports or initialize the 5-Agent solver with our benchmark enterprise batch.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleSeedBenchmark}
              disabled={isSeeding}
              className="px-5 py-2.5 rounded-xl bg-accent text-background font-mono font-bold hover:bg-accent-hover transition-all shadow-glow-sm flex items-center gap-2 text-sm"
            >
              <Sparkles className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Running Solver...' : 'Load Benchmark Seed 42 Batch'}</span>
            </button>
            <Link href="/reconciliation">
              <GlassButton variant="secondary" size="md" icon={<FileSpreadsheet className="w-4 h-4 text-accent" />}>
                Upload Custom CSVs / JSON
              </GlassButton>
            </Link>
          </div>
        </GlassCard>
      ) : (
        /* ============================================================ */
        /* 6-WIDGET LIQUID GLASS CONTROL ROOM GRID (FINRISE STYLE)      */
        /* ============================================================ */
        <div className="space-y-6">
          {/* ROW 1: Balance Spline, Concentric Arcs, Nodal Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Total Reconciled Balance & Spline Wave */}
            <div className="lg:col-span-1">
              <ReconciledBalanceCard
                reconciledValue={reconciledVal}
                totalRecords={totalRecords}
                trendData={currentRun?.trend_chart_data}
              />
            </div>

            {/* Card 2: Concentric Anomaly & Settlement Rings */}
            <div className="lg:col-span-1">
              <ConcentricAnomalyArcs
                totalCleared={totalClearedArc}
                categories={currentRun?.settlement_slices}
              />
            </div>

            {/* Card 3: Gateway Nodal Settlement Card */}
            <div className="lg:col-span-1">
              <NodalGatewayCard
                poolTitle={currentRun?.dataset_name || 'Razorpay Nodal Pool'}
                cardHolder={currentRun?.pipeline_type || 'Verified Enterprise Batch'}
                runId={currentRun?.run_id || 'USER_UPLOAD_RUN'}
              />
            </div>
          </div>

          {/* ROW 2: Stacked Volume Bars, Flow Heatmap & Swarm, Live Stream Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 4: Multi-Ledger Volume & Activity */}
            <div className="lg:col-span-1">
              <MultiLedgerVolumeChart
                totalTxns={currentRun?.txns_count ?? 0}
                payoutsCount={currentRun?.payouts_count ?? 0}
                banksCount={currentRun?.banks_count ?? 0}
                passRate={currentRun ? `${(currentRun.auto_approval_rate * 100).toFixed(1)}%` : '100%'}
                reviewCount={currentRun ? (currentRun.needs_review_count + currentRun.unresolved_count) : 0}
                volumeFlow={currentRun?.volume_flow}
              />
            </div>

            {/* Card 5: Settlement Flow Heatmap & 5-Agent Swarm */}
            <div className="lg:col-span-1">
              <SettlementHeatmapMatrix
                heatmapGrid={currentRun?.heatmap_density}
              />
            </div>

            {/* Card 6: Reconciled History Stream */}
            <div className="lg:col-span-1">
              <LiveSettlementFeed
                feedItems={currentRun?.feed_items}
                onSelectSettlement={handleSelectSettlement}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Footer Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
        <Link href="/agents" className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/05 transition-all group">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-1">
            <span>AI AGENTS SUITE</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white font-mono">5 Agents & XAI Traces</div>
        </Link>

        <Link href="/exceptions" className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/05 transition-all group">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-1">
            <span>EXCEPTION QUEUE</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {currentRun ? `${currentRun.needs_review_count + currentRun.unresolved_count} Flagged` : 'Human SOP Review'}
          </div>
        </Link>

        <Link href="/evidence" className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/05 transition-all group">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-1">
            <span>EVIDENCE LEDGER</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white font-mono">SHA-256 Hash Chained</div>
        </Link>

        <Link href="/replay" className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/05 transition-all group">
          <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-1">
            <span>AUDIT REPLAY</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white font-mono">100% Deterministic Match</div>
        </Link>
      </div>

      {/* Decision Explainability Modal */}
      {selectedExplanation && (
        <ExplainModal
          explanation={selectedExplanation}
          onClose={() => setSelectedExplanation(null)}
        />
      )}
    </div>
  );
}
