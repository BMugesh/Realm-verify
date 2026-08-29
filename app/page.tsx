import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  Database,
  CreditCard,
  Building2,
  Lock,
  Cpu,
  Hash,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassBadge } from '@/components/glass/GlassBadge';

export default function LandingPage() {
  return (
    <div className="w-full flex flex-col items-center">
      {/* ============================================================ */}
      {/* SECTION 1: CINEMATIC HERO                                   */}
      {/* ============================================================ */}
      <section className="relative w-full flex flex-col items-center justify-center px-4 sm:px-6 pt-28 sm:pt-36 pb-12 max-w-7xl mx-auto">
        {/* Subtle Top Badge */}
        <div className="mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill border-accent/30 text-xs font-mono text-white/90 shadow-glow-sm">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>AI FINANCE CONTROLLER TRACK · RAZORPAY 2026</span>
          </div>
        </div>

        {/* Hero Title & Typography */}
        <div className="text-center max-w-4xl mx-auto mb-5">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight uppercase leading-[1.05] text-white">
            FINANCIAL TRUTH <br />
            <span className="text-gradient">PROVEN BY MATH.</span>
          </h1>
        </div>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-white/70 max-w-2xl text-center mb-8 leading-relaxed font-sans">
          Autonomous reconciliation across internal transactions, payment settlements, and bank records.
          <span className="block mt-1.5 text-xs sm:text-sm text-accent font-mono font-medium">
            AI finds candidates. Mathematics decides. Evidence proves.
          </span>
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Link href="/reconciliation">
            <GlassButton variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>
              RUN RECONCILIATION
            </GlassButton>
          </Link>
          <Link href="/agents">
            <GlassButton variant="secondary" size="lg" icon={<Cpu className="w-4 h-4" />}>
              AI AGENTS & EXPLAINABILITY
            </GlassButton>
          </Link>
          <Link href="/architecture">
            <GlassButton variant="ghost" size="lg">
              VIEW ARCHITECTURE
            </GlassButton>
          </Link>
        </div>

        {/* ============================================================ */}
        {/* HERO INTERACTIVE 3-TIER RECONCILIATION VISUALIZATION         */}
        {/* ============================================================ */}
        <div className="w-full max-w-5xl relative mt-4">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 via-[#3B82F6]/20 to-[#6366F1]/20 blur-xl opacity-50" />
          <GlassCard variant="elevated" className="relative p-6 sm:p-10 border-white/15">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
              <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                <span className="w-2.5 h-2.5 rounded-full bg-status-approved" />
                <span>TWO-STAGE EVIDENCE-BOUND RECONCILIATION LOOP</span>
              </div>
              <GlassBadge variant="accent" size="sm">
                0 PAISE RESIDUAL GUARANTEE
              </GlassBadge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 relative">
              {/* Node 1: Internal Ledger */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <Database className="w-5 h-5 text-white/70" />
                  <span className="text-[10px] font-mono text-white/40">STAGE 01</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-1">Internal Ledger</div>
                  <div className="text-xs text-white/50 font-mono">500 Txn Records</div>
                  <div className="text-xs text-white/40 mt-2 font-mono">AMZN-INV-882194</div>
                </div>
              </div>

              {/* Node 2: Gateway Payouts */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <CreditCard className="w-5 h-5 text-accent" />
                  <span className="text-[10px] font-mono text-accent/70">STAGE 01 → 02</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-1">Gateway Payouts</div>
                  <div className="text-xs text-white/50 font-mono">369 Batches (Razorpay)</div>
                  <div className="text-xs text-accent/80 mt-2 font-mono">gross - fees == net</div>
                </div>
              </div>

              {/* Node 3: Bank Feed */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <Building2 className="w-5 h-5 text-white/70" />
                  <span className="text-[10px] font-mono text-white/40">STAGE 02</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-1">Bank Statements</div>
                  <div className="text-xs text-white/50 font-mono">397 Credit Entries</div>
                  <div className="text-xs text-white/40 mt-2 font-mono">CMS/HDFC/RZP-PO</div>
                </div>
              </div>

              {/* Node 4: Verified Evidence */}
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 flex flex-col justify-between shadow-glow-sm">
                <div className="flex items-center justify-between mb-3">
                  <ShieldCheck className="w-5 h-5 text-accent" />
                  <span className="text-[10px] font-mono text-accent font-bold">VERIFIED</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-1">Evidence Ledger</div>
                  <div className="text-xs text-status-approved font-mono font-semibold">
                    ✓ 0.00% False Commits
                  </div>
                  <div className="text-[11px] text-white/50 mt-2 font-mono truncate">
                    SHA256: 8f4a21...c99
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Proof Quote */}
            <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-white/60">
              <span>Trust Statement: AI can discover a match. Only deterministic accounting proof can approve it.</span>
              <Link href="/dashboard" className="text-accent hover:underline flex items-center gap-1">
                <span>View Live Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: HOW IT WORKS (3 PILLARS)                          */}
      {/* ============================================================ */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-accent mb-2">
            METHODOLOGY & REASONING
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white uppercase">
            How Realm Verify Operates
          </h2>
          <p className="text-sm text-white/60 mt-3">
            Three rigorous stages from asynchronous messy operational data to deterministic hash-chained verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Stage 1: DISCOVER */}
          <GlassCard className="flex flex-col justify-between p-8">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent mb-6 font-mono font-bold text-lg">
                01
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-mono">DISCOVER</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Extracts reference tokens, strips noise, parses ISO timestamps to UTC epochs, and discovers 1:1, Many:1 batch settlements and 1:Many split payments using bipartite matching (<code className="text-accent text-xs">scipy.optimize.linear_sum_assignment</code>) and bounded subset search.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-accent">
              • High-entropy token extraction<br />
              • Combinatorial subset solver
            </div>
          </GlassCard>

          {/* Stage 2: VERIFY */}
          <GlassCard className="flex flex-col justify-between p-8 border-accent/25">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-status-approvedBg border border-status-approvedBorder flex items-center justify-center text-status-approved mb-6 font-mono font-bold text-lg">
                02
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-mono">VERIFY</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Applies non-negotiable deterministic accounting constraints in integer paise:
                <code className="block my-2 p-2 rounded bg-black/40 text-xs font-mono text-accent border border-white/10">
                  gross - fees - refunds == net<br />
                  sum(txns) == payout gross<br />
                  sum(banks) == payout net
                </code>
                Zero floating point arithmetic. Zero hallucination risk.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-status-approved">
              • Rule 7 confidence-margin gating<br />
              • 0 paise residual enforcement
            </div>
          </GlassCard>

          {/* Stage 3: PROVE */}
          <GlassCard className="flex flex-col justify-between p-8">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] mb-6 font-mono font-bold text-lg">
                03
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-mono">PROVE & REPLAY</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Every committed decision is recorded in an append-only SQLite store with SHA-256 hash chaining. Enables auditors to re-run any historical batch and verify 100.0% decision matching and 0 paise deviation on demand.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-[#818CF8]">
              • Append-only SHA-256 hash chaining<br />
              • Instant deterministic replay audit
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3: CORE GUARANTEES CALLOUT                           */}
      {/* ============================================================ */}
      <section className="w-full max-w-7xl mx-auto px-6 py-16">
        <GlassCard variant="elevated" className="p-8 sm:p-12 border-accent/30 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <GlassBadge variant="approved" className="mb-4">
                FINANCIAL INTEGRITY PILLAR
              </GlassBadge>
              <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase mb-4">
                The 0-Paise Principle
              </h2>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                Most financial software relies on floating-point floats that accumulate microscopic rounding errors. Realm Verify converts every transaction into integer paise minor units (1 INR = 100 paise), guaranteeing that calculations are exact down to the last decimal.
              </p>
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-white/40">COMMITTED FALSE MATCHES</div>
                  <div className="text-lg font-bold text-status-approved mt-1">0.00%</div>
                  <div className="text-white/50 text-[10px]">Zero tolerance across all seeds</div>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-white/40">BALANCE DISCREPANCY</div>
                  <div className="text-lg font-bold text-status-approved mt-1">0 PAISE</div>
                  <div className="text-white/50 text-[10px]">Mathematical balance gate</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-status-approved shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-white">Advisory-Only LLM Boundary</div>
                  <div className="text-xs text-white/60 mt-1">
                    AI only provides structured similarity proposals on ambiguous clusters. It cannot commit settlements.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-status-approved shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-white">Auditable Exception Routing</div>
                  <div className="text-xs text-white/60 mt-1">
                    Unbalanced or foreign currency records are routed to an exception queue with system SOP recommendations.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-status-approved shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-white">Deterministic Replay Verification</div>
                  <div className="text-xs text-white/60 mt-1">
                    Re-executes any stored audit run with identical configuration and asserts 100% deterministic decision matching.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
