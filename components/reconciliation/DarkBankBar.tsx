'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, Building2, ShieldCheck, Database, Layers } from 'lucide-react';
import { GlassBadge } from '../glass/GlassBadge';

interface DarkBankBarProps {
  selectedBank: string;
  onBankChange: (bank: string) => void;
  openInternalFormatted: string;
  openExternalFormatted: string;
  internalMatchProgress: number; // 0 to 100
  externalMatchProgress: number; // 0 to 100
  periodText: string;
  datasetName?: string;
  detectedBanks?: string[];
  runId?: string;
}

export const DarkBankBar: React.FC<DarkBankBarProps> = ({
  selectedBank,
  onBankChange,
  openInternalFormatted,
  openExternalFormatted,
  internalMatchProgress = 78,
  externalMatchProgress = 85,
  periodText = 'Active Audit Period',
  datasetName = 'Enterprise Multi-Gateway Nodal',
  detectedBanks = [],
  runId,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fallbackBanks = [
    { name: 'HDFC Bank Ltd (Nodal)', code: 'HDFC' },
    { name: 'ICICI Bank Pvt Ltd (Nodal)', code: 'ICICI' },
    { name: 'Axis Bank Limited (Nodal)', code: 'AXIS' },
    { name: 'State Bank of India (Pool)', code: 'SBI' },
    { name: 'Kotak Mahindra Bank (Escrow)', code: 'KOTAK' },
  ];

  // Merge detected banks with standard enterprise banks
  const availableBanks = detectedBanks.length > 0
    ? detectedBanks.map((b) => ({ name: b.includes('(') ? b : `${b} (Nodal)`, code: b }))
    : fallbackBanks;

  return (
    <div className="w-full glass-card rounded-3xl p-5 sm:p-6 border border-white/10 shadow-glass-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-64 h-32 bg-accent/05 blur-3xl pointer-events-none" />

      {/* Left: Bank Logo & Name */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 shadow-glow-sm">
          <Building2 className="w-6 h-6 text-accent" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
              {selectedBank}
            </h2>
            <GlassBadge variant="accent" size="sm">
              LIVE NODAL
            </GlassBadge>
          </div>

          <div className="relative mt-1">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-mono text-white/70 hover:text-accent transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-accent/80" />
              <span className="font-semibold text-white/90">{datasetName}</span>
              {runId && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/40 text-[11px] truncate max-w-[140px]">{runId}</span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 glass-panel rounded-2xl shadow-2xl border border-white/15 py-2 z-30 animate-fade-in bg-[#0B111D]/95 backdrop-blur-xl">
                <div className="px-3 py-1.5 text-[10px] font-bold text-accent uppercase tracking-wider font-mono">
                  Detected Nodal / Pool Accounts
                </div>
                {availableBanks.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      onBankChange(b.name);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-mono flex items-center justify-between transition-colors ${
                      selectedBank === b.name
                        ? 'bg-accent/15 text-accent font-bold'
                        : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {selectedBank === b.name && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Metric 1: Open Internal */}
      <div className="flex items-center justify-between lg:justify-start gap-4 px-2 sm:px-6 lg:border-l lg:border-white/10 relative z-10">
        <div>
          <div className="text-xs font-mono uppercase text-white/50 mb-0.5">Open Internal</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
            {openInternalFormatted}
          </div>
        </div>

        {/* Circular Progress Gauge 1 */}
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/10"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-accent transition-all duration-700"
              strokeDasharray={`${Math.min(100, Math.max(0, internalMatchProgress))}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              opacity={internalMatchProgress > 0 ? 1 : 0}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      </div>

      {/* Middle Metric 2: Open External / Settled */}
      <div className="flex items-center justify-between lg:justify-start gap-4 px-2 sm:px-6 lg:border-l lg:border-white/10 relative z-10">
        <div>
          <div className="text-xs font-mono uppercase text-white/50 mb-0.5">Open External</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-status-approved tracking-tight">
            {openExternalFormatted}
          </div>
        </div>

        {/* Circular Progress Gauge 2 */}
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/10"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-status-approved transition-all duration-700"
              strokeDasharray={`${Math.min(100, Math.max(0, externalMatchProgress))}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              opacity={externalMatchProgress > 0 ? 1 : 0}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      </div>

      {/* Right: Reconcile Period */}
      <div className="flex items-center gap-3 px-2 sm:px-4 lg:border-l lg:border-white/10 relative z-10">
        <div>
          <div className="text-[10px] font-mono uppercase text-white/40 mb-1 tracking-wider">
            Reconcile Period
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono text-white/90">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span>{periodText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
