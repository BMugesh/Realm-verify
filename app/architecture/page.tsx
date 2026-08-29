import React from 'react';
import { ShieldCheck, Lock, Cpu, Database, Hash, CheckCircle2, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassBadge } from '@/components/glass/GlassBadge';

export default function ArchitecturePage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1">
          <Cpu className="w-4 h-4 text-accent" />
          <span>TECHNICAL SPECIFICATIONS & MATHEMATICAL PRINCIPLES</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
          System Architecture
        </h1>
        <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
          Formal accounting constraints, combinatorial candidate matching, and append-only hash chaining.
        </p>
      </div>

      <div className="space-y-8">
        {/* Core Thesis Card */}
        <GlassCard variant="elevated" className="p-8 border-accent/30">
          <div className="text-xs font-mono uppercase text-accent mb-2">SYSTEM THESIS</div>
          <blockquote className="text-lg sm:text-xl font-medium text-white italic border-l-2 border-accent pl-4 my-3">
            &ldquo;Verification capacity—not generation speed—is the bottleneck in finance operations. AI may interpret messy operational evidence, but it must never commit a financial decision unless deterministic accounting constraints validate it.&rdquo;
          </blockquote>
        </GlassCard>

        {/* 2-Stage Pipeline ASCII Diagram */}
        <GlassCard className="p-6 sm:p-8">
          <h2 className="text-base font-bold font-mono text-white uppercase mb-4">
            Two-Stage Reconciliation Loop
          </h2>

          <div className="p-6 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-white/90 overflow-x-auto leading-relaxed">
            <pre className="text-accent">{`
Internal Core Ledger (JSON)       Gateway Payouts (CSV)       Bank Statement Feed (CSV)
            │                              │                            │
            └──────────────┬───────────────┘                            │
                           ▼                                            │
            [Stage 1: Bipartite / Batch Search]                         │
                           │                                            │
                           └───────────────┬────────────────────────────┘
                                           ▼
                            [Stage 2: Payout → Bank Linkage]
                                           │
                                           ▼
                        [Optional LLM Ambiguity Re-ranker]
                                           │
                                           ▼
                     [Deterministic Accounting Validator]
                       • gross - fees - refunds == net
                       • sum(txns) == payout gross
                       • sum(banks) == payout net
                       • Currency & Date window checks
                                           │
                    ┌──────────────────────┼─────────────────────┐
                    ▼                      ▼                     ▼
            [AUTO_APPROVED]         [NEEDS_REVIEW]         [UNRESOLVED]
                   │                       │                     │
                   └───────────────────────┴─────────────────────┘
                                           │
                                           ▼
                          [SHA-256 Chained Evidence Ledger]
            `}</pre>
          </div>
        </GlassCard>

        {/* Accounting Mathematical Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold font-mono text-white uppercase mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent" />
              1. Payout Internal Balance
            </h3>
            <p className="text-xs text-white/70 font-sans mb-3">
              Enforces that the reported net settlement amount mathematically equals gross minus fees and deductions down to 0 paise.
            </p>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 font-mono text-xs text-accent">
              gross - fees - refunds - chargebacks == net
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold font-mono text-white uppercase mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent" />
              2. Stage 1 Batch Gross Sum
            </h3>
            <p className="text-xs text-white/70 font-sans mb-3">
              Solves Many:1 batch settlements by finding the exact subset of internal transactions whose gross equals the payout gross.
            </p>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 font-mono text-xs text-accent">
              sum(txn.gross_minor) == payout.gross_minor
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold font-mono text-white uppercase mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              3. Stage 2 Bank Credit Balance
            </h3>
            <p className="text-xs text-white/70 font-sans mb-3">
              Solves 1:Many split settlements by matching bank credit deposits to the payout net settlement amount.
            </p>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 font-mono text-xs text-accent">
              sum(bank.credit_minor) == payout.net_minor
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold font-mono text-white uppercase mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-accent" />
              4. SHA-256 Hash Chaining
            </h3>
            <p className="text-xs text-white/70 font-sans mb-3">
              Each event block calculates SHA-256 incorporating the previous event hash, record ID, decision, and boolean validator results.
            </p>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 font-mono text-xs text-accent">
              event_hash = SHA256(prev_hash || payload)
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
