'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { GlassButton } from '../glass/GlassButton';
import { StatusBadge } from '../glass/StatusBadge';
import { api } from '@/lib/api';
import { useCurrentRun } from '@/lib/RunContext';

interface RunHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRun: (runId: string) => void;
}

interface RunItem {
  run_id: string;
  pipeline_type: string;
  dataset_name: string;
  created_at: string;
  total_source_records: number;
  reconciled_value_formatted: string;
  unreconciled_value_formatted: string;
  payouts_gross_formatted: string;
  auto_approval_rate: number;
  auto_approved_count: number;
  needs_review_count: number;
  unresolved_count: number;
  exception_count: number;
  duration_seconds: number;
  status: string;
}

export const RunHistoryModal: React.FC<RunHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectRun,
}) => {
  const { currentRun, clearCurrentRun } = useCurrentRun();
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [mongoStatus, setMongoStatus] = useState<{
    is_connected: boolean;
    cluster: string;
    username: string;
    database: string;
    last_error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getReconciliationHistory();
      if (data.runs) {
        setRuns(data.runs);
      }
      if (data.mongodb_status) {
        setMongoStatus(data.mongodb_status);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch run history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#070D18]/95 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* ============================================================ */}
        {/* HEADER                                                       */}
        {/* ============================================================ */}
        <div className="px-6 py-5 border-b border-white/10 bg-[#0B1322] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(21,188,223,0.2)]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-white tracking-tight">
                  Reconciliation Execution & Audit History
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {runs.length} Batches Recorded
                </span>
              </div>
              <p className="text-xs font-mono text-white/50 mt-0.5">
                Complete historical record of all financial batches, uploads, and multi-ledger evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              title="Refresh History"
              className="p-2 rounded-xl bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MONGODB ATLAS CLOUD SYNC STATUS BAR                          */}
        {/* ============================================================ */}
        <div className="px-6 py-3 bg-[#0A1120] border-b border-white/05 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-white/80">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">MongoDB Atlas:</span>
            </div>
            <span className="text-accent font-semibold">
              {mongoStatus?.cluster || 'realm1.litipri.mongodb.net'}
            </span>
            <span className="text-white/40">· User: <code className="text-white/70">{mongoStatus?.username || 'mkbm1307_db_user'}</code></span>
            <span className="text-white/40">· DB: <code className="text-white/70">realm_verify</code></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cloud Storage & Audit Sync Active
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BATCHES LIST                                                 */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {isLoading && runs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/40 text-xs font-mono gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-accent" />
              <span>Fetching audit history from evidence ledger and MongoDB...</span>
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-16 text-white/40 font-mono text-xs">
              No historical batches recorded yet. Upload data to create the first reconciliation run.
            </div>
          ) : (
            runs.map((r) => {
              const isCurrent = currentRun?.run_id === r.run_id;
              return (
                <div
                  key={r.run_id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-accent/[0.08] border-accent/40 shadow-[0_0_20px_rgba(21,188,223,0.1)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-sm text-white">
                        {r.dataset_name || r.run_id}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40">
                          ACTIVE IN STUDIO
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-white/40">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-white/60 flex-wrap">
                      <span>
                        Records: <strong className="text-white">{r.total_source_records}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Reconciled: <strong className="text-emerald-400">{r.reconciled_value_formatted}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Approval Rate: <strong className="text-accent">{Math.round(r.auto_approval_rate * 100)}%</strong>
                      </span>
                      {r.exception_count > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400">
                            Exceptions: <strong>{r.exception_count}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-white/40">
                      ID: <code className="text-white/60">{r.run_id}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onSelectRun(r.run_id);
                        onClose();
                      }}
                      className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-white/10 text-white/60 hover:bg-white/15'
                          : 'bg-accent text-brand-dark hover:bg-accent-hover shadow'
                      }`}
                    >
                      <span>{isCurrent ? 'Viewing in Studio' : 'Load Batch into Studio'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ============================================================ */}
        {/* FOOTER ACTIONS                                               */}
        {/* ============================================================ */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0B1322] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearCurrentRun();
                onClose();
              }}
              title="Reset studio and dashboard to clean zero state"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Studio to Zero State</span>
            </button>
          </div>

          <GlassButton size="sm" variant="secondary" onClick={onClose}>
            Close
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
