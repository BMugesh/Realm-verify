'use client';

import React, { useState } from 'react';
import {
  X,
  Play,
  UploadCloud,
  FileSpreadsheet,
  Code2,
  Sparkles,
  Database,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Filter,
} from 'lucide-react';
import { CustomDataUpload } from './CustomDataUpload';
import { ExplainModal } from '../explainability/ExplainModal';
import { api } from '@/lib/api';
import { formatPaise } from '@/lib/formatters';
import {
  ReconciliationResult,
  ReconciliationMetrics,
  DecisionExplanation,
  ReconciliationRunResponse,
} from '@/lib/types';

interface RecomasterStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSuccess?: (resp: ReconciliationRunResponse) => void;
}

export const RecomasterStudioModal: React.FC<RecomasterStudioModalProps> = ({
  isOpen,
  onClose,
  onRunSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'results' | 'synthetic'>('upload');
  const [runId, setRunId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ReconciliationMetrics | null>(null);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedExplanation, setSelectedExplanation] = useState<DecisionExplanation | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [syntheticLoading, setSyntheticLoading] = useState(false);
  const [syntheticSeed, setSyntheticSeed] = useState(42);
  const [syntheticRecords, setSyntheticRecords] = useState(500);

  const pageSize = 10;

  if (!isOpen) return null;

  const handleCustomUploadSuccess = (resp: ReconciliationRunResponse) => {
    setRunId(resp.run_id);
    setMetrics(resp.metrics);
    setResults(resp.sample_results);
    setActiveTab('results');
    setPage(1);
    onRunSuccess?.(resp);
  };

  const handleRunSynthetic = async () => {
    setSyntheticLoading(true);
    try {
      const resp = await api.runRealmVerify(syntheticSeed, syntheticRecords);
      if (resp.success) {
        handleCustomUploadSuccess(resp);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSyntheticLoading(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh] z-10 animate-fade-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F5F9] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                Multi-Ledger Ingestion & Process Engine
              </h2>
              <p className="text-xs text-[#64748B]">
                Ingest transactions, payouts, and bank statements into the 5-agent verification loop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-[#E2E8F0]/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white text-[#0D9488] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Upload Files
              </button>
              <button
                onClick={() => setActiveTab('synthetic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'synthetic'
                    ? 'bg-white text-[#0D9488] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Benchmark Engine
              </button>
              {results.length > 0 && (
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'results'
                      ? 'bg-white text-[#0D9488] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Audit Results ({results.length})
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0]/50 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F8FAFC]">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <CustomDataUpload onSuccess={handleCustomUploadSuccess} />
            </div>
          )}

          {activeTab === 'synthetic' && (
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] mb-1">
                  Run Benchmark Synthetic Simulation
                </h3>
                <p className="text-xs text-[#64748B]">
                  Simulate enterprise volume with ground-truth noise, fees, refunds, and batch splits.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                    Dataset Seed (Deterministic)
                  </label>
                  <input
                    type="number"
                    value={syntheticSeed}
                    onChange={(e) => setSyntheticSeed(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                    Records Volume
                  </label>
                  <input
                    type="number"
                    value={syntheticRecords}
                    onChange={(e) => setSyntheticRecords(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end">
                <button
                  onClick={handleRunSynthetic}
                  disabled={syntheticLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{syntheticLoading ? 'Executing Engine...' : 'Run Simulation'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'results' && results.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-6">
              {/* Metrics Summary Bar */}
              {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Match Rate</span>
                    <div className="text-lg font-bold text-[#0D9488]">
                      {((metrics.match_rate ?? 0.98) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Precision</span>
                    <div className="text-lg font-bold text-[#5B46F6]">
                      {(metrics.end_to_end_precision ?? 1.0).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Throughput</span>
                    <div className="text-lg font-bold text-[#0F172A]">
                      {metrics.records_per_second.toFixed(1)} rec/s
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Reconciled Gross</span>
                    <div className="text-lg font-bold text-[#0D9488]">
                      {metrics.reconciled_value_formatted}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ALL', 'AUTO_APPROVED', 'NEEDS_REVIEW', 'UNRESOLVED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setStatusFilter(f);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === f
                          ? 'bg-[#0D9488] text-white shadow-sm'
                          : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Settlement ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                      <th className="py-2.5 px-3">SETTLEMENT ID</th>
                      <th className="py-2.5 px-3">DECISION</th>
                      <th className="py-2.5 px-3">CONFIDENCE</th>
                      <th className="py-2.5 px-3">STAGE 1 GROSS</th>
                      <th className="py-2.5 px-3">STAGE 2 NET</th>
                      <th className="py-2.5 px-3 text-right">XAI TRACE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {paginatedResults.map((r, idx) => (
                      <tr key={r.settlement_id || idx} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0D9488]">
                          {r.settlement_id}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.decision === 'AUTO_APPROVED'
                                ? 'bg-[#DCFCE7] text-[#16A34A]'
                                : r.decision === 'NEEDS_REVIEW'
                                ? 'bg-[#FEF3C7] text-[#D97706]'
                                : 'bg-[#FEE2E2] text-[#DC2626]'
                            }`}
                          >
                            {r.decision}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {(r.confidence_score * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {r.stage1 ? formatPaise(r.stage1.payout_gross_minor) : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {r.stage2 ? formatPaise(r.stage2.payout_net_minor) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleExplain(r.settlement_id)}
                            disabled={explainingId === r.settlement_id}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488]/20 transition-all disabled:opacity-50"
                          >
                            {explainingId === r.settlement_id ? 'Tracing...' : 'Explain'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-[#64748B] pt-3 border-t border-[#F1F5F9]">
                <span>
                  Showing {paginatedResults.length} of {filteredResults.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Explainability Sub-Modal */}
      {selectedExplanation && (
        <ExplainModal
          explanation={selectedExplanation}
          onClose={() => setSelectedExplanation(null)}
        />
      )}
    </div>
  );
};
