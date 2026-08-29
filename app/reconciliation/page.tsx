'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  Sparkles,
  RefreshCw,
  Search,
  AlertCircle,
  History,
  RotateCcw,
  PlusCircle,
  FileCheck,
} from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { StatusBadge } from '@/components/glass/StatusBadge';
import { CustomDataUpload, UploadedSourceSummary } from '@/components/reconciliation/CustomDataUpload';
import { DarkBankBar } from '@/components/reconciliation/DarkBankBar';
import { DarkComparisonCards } from '@/components/reconciliation/DarkComparisonCards';
import { DarkBottomCharts } from '@/components/reconciliation/DarkBottomCharts';
import { RunHistoryModal } from '@/components/reconciliation/RunHistoryModal';
import { ExplainModal } from '@/components/explainability/ExplainModal';
import { useCurrentRun } from '@/lib/RunContext';
import { api } from '@/lib/api';
import { formatPaise } from '@/lib/formatters';
import {
  DecisionExplanation,
  ReconciliationRunResponse,
} from '@/lib/types';

export default function ReconciliationPage() {
  const {
    currentRun,
    isLoading,
    error: contextError,
    refreshCurrentRun,
    setCurrentRun,
    loadRun,
    clearCurrentRun,
  } = useCurrentRun();

  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedExplanation, setSelectedExplanation] = useState<DecisionExplanation | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [showUploadStudio, setShowUploadStudio] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedBank, setSelectedBank] = useState<string>('Multi-Gateway Nodal Pool');

  const pageSize = 15;

  const handleCustomUploadSuccess = (
    resp: ReconciliationRunResponse,
    _summary?: UploadedSourceSummary
  ) => {
    if (resp.summary) {
      setCurrentRun(resp.summary);
    }
    setPage(1);
    setError(null);
    setShowUploadStudio(false);
  };

  const handleExplain = async (settlementId: string) => {
    setExplainingId(settlementId);
    try {
      const expl = await api.explainDecision(settlementId);
      setSelectedExplanation(expl);
    } catch (err: any) {
      console.error('Explain error:', err);
    } finally {
      setExplainingId(null);
    }
  };

  const results = currentRun?.sample_results || [];

  // Filter & paginate results
  const filteredResults = results.filter((r) => {
    if (statusFilter !== 'ALL' && r.decision !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const settlementMatch = r.settlement_id.toLowerCase().includes(q);
      const txnMatch = r.stage1?.transaction_ids.some((id) => id.toLowerCase().includes(q));
      const bankMatch = r.stage2?.bank_entry_ids.some((id) => id.toLowerCase().includes(q));
      return settlementMatch || txnMatch || bankMatch;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const paginatedResults = filteredResults.slice((page - 1) * pageSize, page * pageSize);

  // Derive real display figures strictly from current run or 0 if unsubmitted
  const hasActiveRun = !!currentRun && (currentRun.total_source_records ?? 0) > 0;
  const openInternalVal = hasActiveRun ? (currentRun.txns_gross_formatted || '₹0.00') : '₹0.00';
  const openExternalVal = hasActiveRun ? (currentRun.reconciled_value_formatted || '₹0.00') : '₹0.00';
  const internalProgress = hasActiveRun ? Math.round(currentRun.auto_approval_rate * 100) : 0;
  const externalProgress = hasActiveRun ? Math.round(currentRun.match_rate * 100) : 0;
  const periodText = hasActiveRun ? (currentRun.date_range || 'Active Audit Period') : 'Awaiting Data Ingestion';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & INGESTION STUDIO TOGGLE ACTIONS              */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>RECONCILIATION ENGINE · 5-AGENT MULTI-LEDGER TELEMETRY</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
            Reconciliation Studio
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
            {hasActiveRun
              ? `Unified Single Source of Truth · Run ID: ${currentRun.run_id} (${currentRun.dataset_name})`
              : 'Zero initial state. Upload multi-source financial ledgers (Internal, Gateway, Bank Feed) to execute deterministic 0-paise reconciliation.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* History / Audit Modal Trigger */}
          <GlassButton
            size="sm"
            variant="secondary"
            icon={<History className="w-3.5 h-3.5 text-accent" />}
            onClick={() => setShowHistoryModal(true)}
          >
            Audit History
          </GlassButton>

          {/* Reset to Zero State */}
          {hasActiveRun && (
            <GlassButton
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="w-3.5 h-3.5 text-rose-400" />}
              onClick={() => clearCurrentRun()}
              title="Reset studio metrics to zero"
            >
              Reset to Zero
            </GlassButton>
          )}

          <GlassButton
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={refreshCurrentRun}
          >
            Refresh
          </GlassButton>

          <GlassButton
            size="sm"
            variant={showUploadStudio ? 'secondary' : 'primary'}
            icon={<UploadCloud className="w-4 h-4" />}
            onClick={() => setShowUploadStudio(!showUploadStudio)}
          >
            {showUploadStudio ? 'Hide Upload Studio' : 'Upload Data / Ingest Files'}
          </GlassButton>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. EXPANDABLE DATA INGESTION STUDIO (CUSTOM CSV/JSON UPLOAD) */}
      {/* ============================================================ */}
      {showUploadStudio && (
        <div className="mb-8 animate-fade-up">
          <CustomDataUpload onSuccess={handleCustomUploadSuccess} />
        </div>
      )}

      {(error || contextError) && (
        <div className="mb-6 p-4 rounded-xl bg-status-unresolved/20 border border-status-unresolved/40 text-status-unresolved text-sm font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error || contextError}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TOP BANK / NODAL ENTITY BAR (100% CANONICAL RUN DATA)     */}
      {/* ============================================================ */}
      <div className="mb-6">
        <DarkBankBar
          selectedBank={currentRun?.primary_bank_name || selectedBank || 'Multi-Gateway Nodal Pool'}
          onBankChange={setSelectedBank}
          openInternalFormatted={openInternalVal}
          openExternalFormatted={openExternalVal}
          internalMatchProgress={internalProgress}
          externalMatchProgress={externalProgress}
          periodText={periodText}
          datasetName={hasActiveRun ? (currentRun?.dataset_name || 'Enterprise Multi-Gateway Nodal') : 'Awaiting Ingestion'}
          detectedBanks={currentRun?.detected_banks || []}
          runId={currentRun?.run_id}
        />
      </div>

      {/* ============================================================ */}
      {/* 4. TODAY & BACKLOG COMPARISON CARDS (100% CANONICAL RUN DATA)*/}
      {/* ============================================================ */}
      <div className="mb-6">
        <DarkComparisonCards
          runSummary={currentRun}
          totalRecords={hasActiveRun ? (currentRun?.total_source_records ?? 0) : 0}
        />
      </div>

      {/* ============================================================ */}
      {/* 5. BOTTOM ROW (SETTLED AMOUNT WAVE + CONCENTRIC DONUT RINGS) */}
      {/* ============================================================ */}
      <div className="mb-8">
        <DarkBottomCharts
          runSummary={currentRun}
          totalRecords={hasActiveRun ? (currentRun?.total_source_records ?? 0) : 0}
          activeSettledValue={hasActiveRun ? currentRun?.reconciled_value_formatted : '₹0.00'}
        />
      </div>

      {/* ============================================================ */}
      {/* 6. REAL DECISION RESULTS AUDIT TABLE                         */}
      {/* ============================================================ */}
      {results.length > 0 ? (
        <GlassCard variant="elevated" className="p-6 animate-fade-up mt-8 border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'AUTO_APPROVED', 'NEEDS_REVIEW', 'UNRESOLVED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setStatusFilter(filter);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                    statusFilter === filter
                      ? 'bg-accent text-background font-bold shadow-glow-sm'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Settlement ID, Txn, Bank..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-white/10 text-white/50 font-mono text-[11px]">
                  <th className="py-3 px-3">SETTLEMENT ID</th>
                  <th className="py-3 px-3">DECISION</th>
                  <th className="py-3 px-3">CONFIDENCE</th>
                  <th className="py-3 px-3">STAGE 1 TXNS</th>
                  <th className="py-3 px-3">GROSS (PAISE)</th>
                  <th className="py-3 px-3">STAGE 2 BANKS</th>
                  <th className="py-3 px-3">NET (PAISE)</th>
                  <th className="py-3 px-3">STATUS & CONSTRAINTS</th>
                  <th className="py-3 px-3 text-right">EXPLAINABLE AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {paginatedResults.map((r, idx) => (
                  <tr key={r.settlement_id || idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono font-bold text-accent">
                      {r.settlement_id}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.decision} />
                    </td>
                    <td className="py-3 px-3 font-mono text-white/80">
                      {(r.confidence_score * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-white/70">
                      {r.stage1 ? r.stage1.transaction_ids.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      {r.stage1 ? formatPaise(r.stage1.payout_gross_minor) : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-white/70">
                      {r.stage2 ? r.stage2.bank_entry_ids.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      {r.stage2 ? formatPaise(r.stage2.payout_net_minor) : '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-white/60 font-mono">
                      {r.failure_reasons && r.failure_reasons.length > 0 ? (
                        <span className="text-status-review font-medium">
                          {r.failure_reasons.join('; ')}
                        </span>
                      ) : (
                        <span className="text-status-approved">✓ Constraints Validated</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleExplain(r.settlement_id)}
                        disabled={explainingId === r.settlement_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{explainingId === r.settlement_id ? 'Tracing...' : 'Explain'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/50">
            <span>
              Showing {paginatedResults.length} of {filteredResults.length} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </GlassCard>
      ) : (
        /* Empty / Zero Initial State Card */
        <GlassCard variant="elevated" className="p-8 sm:p-12 text-center animate-fade-up border-white/10 mt-8">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto mb-4 shadow-[0_0_20px_rgba(21,188,223,0.15)]">
            <UploadCloud className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-bold font-mono text-white mb-2">
            No Active Reconciliation Batch
          </h3>
          <p className="text-xs sm:text-sm font-mono text-white/50 max-w-lg mx-auto mb-6">
            Studio is in a clean initial zero state. Ingest your three-source financial files (Internal ledger, Razorpay payout reports, and Nodal bank statements) or select a batch from Audit History.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <GlassButton
              size="md"
              variant="primary"
              icon={<UploadCloud className="w-4 h-4" />}
              onClick={() => setShowUploadStudio(true)}
            >
              Upload Data / Ingest Files
            </GlassButton>
            <GlassButton
              size="md"
              variant="secondary"
              icon={<History className="w-4 h-4 text-accent" />}
              onClick={() => setShowHistoryModal(true)}
            >
              Load from Audit History
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Decision Explainability Modal */}
      {selectedExplanation && (
        <ExplainModal
          explanation={selectedExplanation}
          onClose={() => setSelectedExplanation(null)}
        />
      )}

      {/* Full Audit History & Batches Modal */}
      <RunHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectRun={(runId) => loadRun(runId)}
      />
    </div>
  );
}
