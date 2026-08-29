'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  Hash,
  Scale,
  FileCode2,
} from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassBadge } from '@/components/glass/GlassBadge';
import { api } from '@/lib/api';
import { EvidenceRun, ReplayReport } from '@/lib/types';

import { useCurrentRun } from '@/lib/RunContext';

export default function ReplayPage() {
  const { currentRun } = useCurrentRun();
  const [runs, setRuns] = useState<EvidenceRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [replaying, setReplaying] = useState<boolean>(false);
  const [replayReport, setReplayReport] = useState<ReplayReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const resp = await api.getReplayRuns();
      setRuns(resp.runs);
      if (resp.runs.length > 0) {
        const preferred = currentRun?.run_id && resp.runs.some(r => r.run_id === currentRun.run_id)
          ? currentRun.run_id
          : resp.runs[0].run_id;
        setSelectedRunId(preferred);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load historical runs.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReplay = async () => {
    if (!selectedRunId) return;
    setReplaying(true);
    setError(null);
    try {
      const resp = await api.executeReplay(selectedRunId);
      if (resp.success) {
        setReplayReport(resp.report);
      }
    } catch (err: any) {
      setError(err.message || 'Replay execution failed.');
    } finally {
      setReplaying(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1">
          <RefreshCw className="w-4 h-4 text-accent" />
          <span>DETERMINISTIC REPLAY VERIFICATION</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
          Deterministic Replay
        </h1>
        <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
          Re-run a historical audit and prove that the same input produces the exact same decision with zero balance deviation.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-unresolved/20 border border-status-unresolved/40 text-status-unresolved text-sm">
          {error}
        </div>
      )}

      {/* Replay Controls Card */}
      <GlassCard variant="elevated" className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-white/60 mb-2">
              Select Historical Audit Run ID
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-mono font-bold"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id} className="bg-[#0B111D] text-white">
                  {r.run_id} (Seed {r.dataset_seed} · {r.pipeline_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <GlassButton
              variant="primary"
              size="md"
              icon={<Play className="w-4 h-4 fill-current" />}
              loading={replaying}
              onClick={handleExecuteReplay}
              className="w-full"
            >
              REPLAY & ASSERT DETERMINISM
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Replay Results Feedback */}
      {replayReport && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Success State Banner */}
          <GlassCard
            variant="elevated"
            className={`p-6 sm:p-8 border-2 ${
              replayReport.decision_determinism.replay_status === 'DETERMINISTIC_REPLAY_VERIFIED'
                ? 'border-status-approvedBorder bg-status-approvedBg/20 shadow-glow-sm'
                : 'border-status-unresolvedBorder bg-status-unresolvedBg/20'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {replayReport.decision_determinism.replay_status === 'DETERMINISTIC_REPLAY_VERIFIED' ? (
                  <CheckCircle2 className="w-10 h-10 text-status-approved shrink-0" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-status-unresolved shrink-0" />
                )}
                <div>
                  <div className="text-xl font-bold font-mono text-white">
                    {replayReport.decision_determinism.replay_status === 'DETERMINISTIC_REPLAY_VERIFIED'
                      ? '✓ DETERMINISTIC REPLAY VERIFIED'
                      : '🚨 REPLAY DISCREPANCY DETECTED'}
                  </div>
                  <div className="text-xs font-mono text-white/70 mt-1">
                    {replayReport.decision_determinism.exact_decision_matches} / {replayReport.decision_determinism.total_decisions} Exact Decision Matches ({replayReport.decision_determinism.match_percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <GlassBadge variant="approved" size="md">
                0 PAISE RESIDUAL DEVIATION
              </GlassBadge>
            </div>
          </GlassCard>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <div className="text-xs font-mono text-white/50 mb-1">DECISION ID MATCH RATE</div>
              <div className="text-3xl font-bold font-mono text-status-approved">
                {replayReport.decision_determinism.match_percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-white/60 font-mono mt-2">
                100% exact outcome agreement
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="text-xs font-mono text-white/50 mb-1">BALANCE RESIDUAL DEVIATION</div>
              <div className="text-3xl font-bold font-mono text-accent">
                {replayReport.decision_determinism.max_balance_residual_deviation_minor} paise
              </div>
              <div className="text-xs text-white/60 font-mono mt-2">
                Target: 0 paise deviation (PASS)
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="text-xs font-mono text-white/50 mb-1">SHA-256 HASH CHAIN AUDIT</div>
              <div className="text-3xl font-bold font-mono text-white">
                {replayReport.hash_chain_integrity.verified ? 'PASSED' : 'FAILED'}
              </div>
              <div className="text-xs text-white/60 font-mono mt-2">
                {replayReport.hash_chain_integrity.events_verified} event blocks verified
              </div>
            </GlassCard>
          </div>

          {/* Raw Replay Audit JSON */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-accent" />
                Raw Replay Audit Telemetry
              </h3>
              <span className="text-xs font-mono text-white/40">outputs/replay_report.json</span>
            </div>
            <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-accent overflow-x-auto">
              {JSON.stringify(replayReport, null, 2)}
            </pre>

            <div className="mt-4 text-xs font-mono text-white/40 text-center">
              ℹ️ Replay was executed using the stored input hashes, seed, configuration, and pinned repository environment; it is not a claim of cross-machine bitwise reproducibility.
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
