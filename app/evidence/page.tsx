'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Hash,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Search,
  Database,
  Layers,
} from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassBadge } from '@/components/glass/GlassBadge';
import { StatusBadge } from '@/components/glass/StatusBadge';
import { api } from '@/lib/api';
import { truncateHash } from '@/lib/formatters';
import { EvidenceRun, EvidenceEvent } from '@/lib/types';

import { useCurrentRun } from '@/lib/RunContext';

export default function EvidencePage() {
  const { currentRun } = useCurrentRun();
  const [runs, setRuns] = useState<EvidenceRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [events, setEvents] = useState<EvidenceEvent[]>([]);
  const [integrityVerified, setIntegrityVerified] = useState<boolean>(true);
  const [integrityMsg, setIntegrityMsg] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<EvidenceEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const resp = await api.getEvidenceRuns();
      setRuns(resp.runs);
      if (resp.runs.length > 0) {
        const preferredRun = currentRun?.run_id && resp.runs.some(r => r.run_id === currentRun.run_id)
          ? currentRun.run_id
          : resp.runs[0].run_id;
        setSelectedRunId(preferredRun);
        await loadRunEvents(preferredRun);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence runs.');
    } finally {
      setLoading(false);
    }
  };

  const loadRunEvents = async (runId: string) => {
    try {
      const resp = await api.getEvidenceEvents(runId);
      setEvents(resp.events);
      setIntegrityVerified(resp.integrity_verified);
      setIntegrityMsg(resp.integrity_message);
      if (resp.events.length > 0) {
        setSelectedEvent(resp.events[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load events for run.');
    }
  };

  const handleVerifyChain = async () => {
    if (!selectedRunId) return;
    setVerifying(true);
    try {
      const resp = await api.verifyEvidenceChain(selectedRunId);
      setIntegrityVerified(resp.is_valid);
      setIntegrityMsg(resp.message);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rId = e.target.value;
    setSelectedRunId(rId);
    loadRunEvents(rId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1">
          <Hash className="w-4 h-4 text-accent" />
          <span>TAMPER-EVIDENT AUDIT LOG · SHA-256 HASH CHAINING</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
          Cryptographic Evidence Ledger
        </h1>
        <p className="text-xs sm:text-sm text-white/70 mt-1">
          Append-only institutional audit store recording every reconciliation decision in SHA-256 hash-linked blocks for zero-tamper verification.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-unresolved/20 border border-status-unresolved/40 text-status-unresolved text-sm">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. RUN SELECTION & INTEGRITY STATUS BANNER                   */}
      {/* ============================================================ */}
      <GlassCard variant="elevated" className="p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <label className="block text-xs font-mono uppercase text-white/60 mb-2">
              Select Audit Run ID
            </label>
            <select
              value={selectedRunId}
              onChange={handleRunChange}
              className="w-full max-w-md px-4 py-2.5 rounded-xl glass-input text-sm font-mono font-bold"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id} className="bg-[#0B111D] text-white">
                  {r.run_id} (Seed {r.dataset_seed} · {r.total_records} recs)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="p-4 rounded-xl glass-card flex items-center gap-3 border-status-approvedBorder bg-status-approvedBg">
              <ShieldCheck className="w-6 h-6 text-status-approved" />
              <div>
                <div className="text-xs font-mono text-status-approved uppercase font-bold">
                  CHAIN STATUS: {integrityVerified ? 'INTEGRITY VERIFIED' : 'TAMPERED'}
                </div>
                <div className="text-[11px] text-white/60 font-mono">
                  {integrityMsg || `${events.length} blocks verified`}
                </div>
              </div>
            </div>

            <GlassButton
              variant="primary"
              size="md"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />}
              loading={verifying}
              onClick={handleVerifyChain}
            >
              VERIFY CHAIN
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* ============================================================ */}
      {/* 2. EVENT LIST & INTERACTIVE INSPECTOR                        */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Blocks Table */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold font-mono text-white uppercase">
              Event Blocks in Chain ({events.length} events)
            </h3>
            <span className="text-xs font-mono text-white/40">Click row to inspect</span>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="sticky top-0 bg-[#0B111D] z-10">
                <tr className="border-b border-white/10 text-white/50 text-[11px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">RECORD ID</th>
                  <th className="py-2.5 px-3">DECISION</th>
                  <th className="py-2.5 px-3">PREV HASH</th>
                  <th className="py-2.5 px-3">EVENT HASH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {events.map((e) => {
                  const isSelected = selectedEvent?.event_index === e.event_index;
                  return (
                    <tr
                      key={e.event_index}
                      onClick={() => setSelectedEvent(e)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-accent/15 text-white font-bold' : 'hover:bg-white/[0.03] text-white/70'
                      }`}
                    >
                      <td className="py-2.5 px-3">{e.event_index}</td>
                      <td className="py-2.5 px-3 text-white font-bold">{e.record_id}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={e.decision} />
                      </td>
                      <td className="py-2.5 px-3 text-white/40">{truncateHash(e.previous_event_hash, 6)}</td>
                      <td className="py-2.5 px-3 text-accent font-semibold">{truncateHash(e.event_hash, 6)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Event Deep-Dive Inspector */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-accent" />
                Event Inspector
              </h3>
              <span className="text-xs font-mono text-accent">
                Block #{selectedEvent?.event_index || 1}
              </span>
            </div>

            {selectedEvent ? (
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="text-white/40 block mb-1">RECORD ID & DECISION</span>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/10">
                    <span className="font-bold text-white text-sm">{selectedEvent.record_id}</span>
                    <StatusBadge status={selectedEvent.decision} />
                  </div>
                </div>

                {/* Validator Boolean Results */}
                <div>
                  <span className="text-white/40 block mb-1">ACCOUNTING VALIDATOR CHECKS</span>
                  <div className="space-y-1.5 p-3 rounded-lg bg-black/40 border border-white/10">
                    {Object.entries(selectedEvent.validator_results || {}).map(([rule, pass]) => (
                      <div key={rule} className="flex items-center justify-between text-[11px]">
                        <span className="text-white/70">{rule}</span>
                        {pass ? (
                          <span className="text-status-approved font-bold">✓ PASS</span>
                        ) : (
                          <span className="text-status-unresolved font-bold">× FAIL</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SHA-256 Block Hashes */}
                <div>
                  <span className="text-white/40 block mb-1">CURRENT BLOCK SHA-256 HASH</span>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-[10px] text-accent break-all select-all font-mono">
                    {selectedEvent.event_hash}
                  </div>
                </div>

                <div>
                  <span className="text-white/40 block mb-1">PREVIOUS BLOCK HASH</span>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-[10px] text-white/50 break-all select-all font-mono">
                    {selectedEvent.previous_event_hash}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-white/40 text-xs font-mono">
                Select an event block to view validator evidence.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
