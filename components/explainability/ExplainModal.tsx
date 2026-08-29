'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Layers,
  Lock,
  Activity,
  Check,
} from 'lucide-react';
import { GlassButton } from '../glass/GlassButton';
import { StatusBadge } from '../glass/StatusBadge';
import { DecisionExplanation } from '@/lib/types';
import { formatPaise } from '@/lib/formatters';
import { ExplainChatAssistant } from './ExplainChatAssistant';
import { MessageSquare, Bot, Sparkles } from 'lucide-react';

interface ExplainModalProps {
  explanation: DecisionExplanation | null;
  onClose: () => void;
  initialTab?: 'proof' | 'assistant';
}

export const ExplainModal: React.FC<ExplainModalProps> = ({ explanation, onClose, initialTab = 'proof' }) => {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'proof' | 'assistant'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, explanation?.settlement_id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && explanation) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [explanation, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (explanation) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [explanation]);

  if (!mounted || !explanation) return null;

  const {
    settlement_id,
    decision,
    confidence_score,
    summary_verdict,
    arithmetic_proof,
    agent_consensus,
    step_traces,
    recommended_action,
  } = explanation;

  const isApproved = decision === 'AUTO_APPROVED';
  const isReview = decision === 'NEEDS_REVIEW';
  const isUnresolved = decision === 'UNRESOLVED';

  const s1Exact = arithmetic_proof.stage1_gross_balance_delta === 0;
  const s2Exact = arithmetic_proof.stage2_net_balance_delta === 0;

  const s1HasZeroTxns = arithmetic_proof.matched_transactions_gross_paise === 0;
  const s2HasZeroBanks = arithmetic_proof.bank_credits_sum_paise === 0;

  // Format verdict summary to highlight raw anomaly codes as clean chips
  const renderVerdict = (text: string) => {
    const parts = text.split(/(STAGE\d_[A-Z_]+|[A-Z_]{4,})/g);
    return parts.map((part, i) => {
      if (part.startsWith('STAGE') || (part.length > 5 && part === part.toUpperCase() && part.includes('_'))) {
        return (
          <code
            key={i}
            className="inline-block px-2 py-0.5 mx-1 rounded bg-red-500/15 border border-red-500/30 text-red-300 font-mono text-xs font-semibold tracking-wide"
          >
            {part}
          </code>
        );
      }
      return part;
    });
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 pt-20 sm:pt-24 pb-6 sm:pb-8 overflow-hidden"
    >
      {/* Deep Immersive Backdrop */}
      <div
        className="fixed inset-0 bg-[#02050B]/90 backdrop-blur-2xl transition-opacity z-[99999]"
        onClick={onClose}
      />

      {/* Centered Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[82vh] my-auto flex flex-col rounded-2xl sm:rounded-3xl border border-white/20 shadow-[0_0_90px_rgba(0,0,0,0.95)] z-[100000] animate-fade-up bg-[#0B111D] overflow-hidden">
        
        {/* ============================================================ */}
        {/* 1. PINNED STICKY HEADER                                     */}
        {/* ============================================================ */}
        <div className="border-b border-white/10 px-6 sm:px-8 py-4 sm:py-5 bg-[#0B111D] shrink-0 z-20">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2 text-[11px] font-mono text-accent font-semibold tracking-wider uppercase">
                <Cpu className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span>Explainable AI (XAI) · Decision Audit Trace</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                  {settlement_id}
                </h2>
                <StatusBadge status={decision} />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-[11px] font-mono font-bold text-accent">
                  <Activity className="w-3 h-3" />
                  <span>{(confidence_score * 100).toFixed(0)}% CONFIDENCE</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close audit trace modal"
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/05">
            <button
              onClick={() => setActiveTab('proof')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                activeTab === 'proof'
                  ? 'bg-accent/20 text-accent border border-accent/40 shadow-[0_0_15px_rgba(21,188,223,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/05 border border-transparent'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>0-Paise Mathematical Proof</span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all relative ${
                activeTab === 'assistant'
                  ? 'bg-accent text-brand-dark font-bold border border-accent shadow-[0_0_20px_rgba(21,188,223,0.35)]'
                  : 'text-accent hover:bg-accent/10 border border-accent/30'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Explain Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. TAB CONTENT: ASSISTANT CHAT OR AUDIT PROOF               */}
        {/* ============================================================ */}
        {activeTab === 'assistant' ? (
          <div className="flex-1 min-h-0 h-full overflow-hidden">
            <ExplainChatAssistant
              recordId={settlement_id}
              initialDecision={decision}
              initialConfidence={confidence_score}
              isEmbedded
              className="h-full rounded-none border-0 shadow-none bg-transparent"
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 custom-scrollbar">
            
            {/* Section 1: Explainable Verdict Summary */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isApproved
                ? 'bg-status-approved/05 border-status-approved/30'
                : isReview
                ? 'bg-status-review/05 border-status-review/30'
                : 'bg-status-unresolved/05 border-status-unresolved/30'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider mb-2.5">
              {isApproved ? (
                <CheckCircle2 className="w-4 h-4 text-status-approved" />
              ) : isReview ? (
                <AlertTriangle className="w-4 h-4 text-status-review" />
              ) : (
                <XCircle className="w-4 h-4 text-status-unresolved" />
              )}
              <span
                className={
                  isApproved
                    ? 'text-status-approved'
                    : isReview
                    ? 'text-status-review'
                    : 'text-status-unresolved'
                }
              >
                Explainable Verdict Summary
              </span>
            </div>

            <p className="text-sm sm:text-base text-white/90 leading-relaxed font-sans font-medium">
              {renderVerdict(summary_verdict)}
            </p>

            {recommended_action && (
              <div className="mt-4 pt-3.5 border-t border-white/10 flex items-start gap-2.5 text-xs text-white/80 font-mono">
                <span className="px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-bold shrink-0">
                  ACTION REQUIRED
                </span>
                <span className="leading-relaxed">{recommended_action}</span>
              </div>
            )}
          </div>

          {/* Section 2: Deterministic Mathematical Proof */}
          <div>
            <div className="text-xs font-mono uppercase text-white/60 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span className="font-bold text-white tracking-wider">
                  Deterministic Accounting Proof (0-Paise Invariant)
                </span>
              </div>
              <span className="text-[10px] text-accent/80 font-mono">INTEGER ARITHMETIC</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* STAGE 1 CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-3 pb-2 border-b border-white/10">
                    <span className="font-bold tracking-wider">STAGE 1: GROSS TRANSACTIONS</span>
                    <span className="text-white/40">Ledger ↔ Gateway</span>
                  </div>

                  {/* Dual Column Value Box */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/05 flex flex-col justify-between">
                      <div className="text-[10px] font-mono text-white/50 uppercase truncate">
                        Sum(Txns Gross)
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                        {arithmetic_proof.matched_transactions_gross_formatted}
                      </div>
                      <div className="text-[10px] font-mono mt-1">
                        {s1HasZeroTxns ? (
                          <span className="text-red-400 font-medium">0 candidate txns matched</span>
                        ) : (
                          <span className="text-white/40">Source ledger verified</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/05 flex flex-col justify-between">
                      <div className="text-[10px] font-mono text-white/50 uppercase truncate">
                        Payout Gross
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                        {arithmetic_proof.payout_gross_formatted}
                      </div>
                      <div className="text-[10px] font-mono text-white/40 mt-1">
                        Gateway payout target
                      </div>
                    </div>
                  </div>
                </div>

                {/* Symmetrical Residual / Status Strip */}
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                    s1Exact
                      ? 'bg-status-approved/10 border-status-approved/30 text-status-approved'
                      : 'bg-status-unresolved/10 border-status-unresolved/30 text-status-unresolved'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {s1Exact ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>EXACT MATCH</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span>DISCREPANCY</span>
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold">
                      {s1Exact
                        ? '₹0.00 delta'
                        : `${formatPaise(arithmetic_proof.stage1_gross_balance_delta)} discrepancy`}
                    </div>
                    <div className="text-[10px] text-white/40 font-normal">
                      {s1Exact
                        ? '0 paise residual'
                        : `${arithmetic_proof.stage1_gross_balance_delta.toLocaleString('en-IN')} paise precision`}
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 2 CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-3 pb-2 border-b border-white/10">
                    <span className="font-bold tracking-wider">STAGE 2: NET BANK DEPOSIT</span>
                    <span className="text-white/40">Gateway ↔ Bank Feed</span>
                  </div>

                  {/* Dual Column Value Box */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/05 flex flex-col justify-between">
                      <div className="text-[10px] font-mono text-white/50 uppercase truncate">
                        Sum(Bank Credits)
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                        {arithmetic_proof.bank_credits_sum_formatted}
                      </div>
                      <div className="text-[10px] font-mono mt-1">
                        {s2HasZeroBanks ? (
                          <span className="text-red-400 font-medium">0 bank deposits matched</span>
                        ) : (
                          <span className="text-white/40">Bank feed verified</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/05 flex flex-col justify-between">
                      <div className="text-[10px] font-mono text-white/50 uppercase truncate">
                        Payout Net
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                        {arithmetic_proof.payout_net_formatted}
                      </div>
                      <div className="text-[10px] font-mono text-white/40 mt-1">
                        Net settlement target
                      </div>
                    </div>
                  </div>
                </div>

                {/* Symmetrical Residual / Status Strip */}
                <div
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                    s2Exact
                      ? 'bg-status-approved/10 border-status-approved/30 text-status-approved'
                      : 'bg-status-unresolved/10 border-status-unresolved/30 text-status-unresolved'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {s2Exact ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>EXACT MATCH</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span>DISCREPANCY</span>
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold">
                      {s2Exact
                        ? '₹0.00 delta'
                        : `${formatPaise(arithmetic_proof.stage2_net_balance_delta)} discrepancy`}
                    </div>
                    <div className="text-[10px] text-white/40 font-normal">
                      {s2Exact
                        ? '0 paise residual'
                        : `${arithmetic_proof.stage2_net_balance_delta.toLocaleString('en-IN')} paise precision`}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: 5-Agent Decision Consensus Grid */}
          <div>
            <div className="text-xs font-mono uppercase text-white/60 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-white tracking-wider">
                5-Agent Consensus Checklist
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {Object.entries(agent_consensus).map(([rule, passed], idx) => (
                <div
                  key={rule}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    passed
                      ? 'bg-white/[0.02] border-white/10 hover:border-status-approved/40'
                      : 'bg-status-unresolved/05 border-status-unresolved/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40">0{idx + 1}</span>
                    {passed ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-status-approved bg-status-approved/10 px-1.5 py-0.5 rounded border border-status-approved/30">
                        <Check className="w-2.5 h-2.5" /> PASS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-status-unresolved bg-status-unresolved/10 px-1.5 py-0.5 rounded border border-status-unresolved/30">
                        <X className="w-2.5 h-2.5" /> FAIL
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono font-medium text-white/80 leading-snug">
                    {rule}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Step-by-Step Reasoning Trajectory */}
          <div>
            <div className="text-xs font-mono uppercase text-white/60 mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-white tracking-wider">
                Step-by-Step Reasoning Trajectory
              </span>
            </div>

            <div className="space-y-3">
              {step_traces.map((trace) => {
                const isTracePassed =
                  trace.status === 'PASSED' ||
                  trace.status === 'APPROVED' ||
                  trace.status === 'CHAINED' ||
                  trace.status === 'CONFIRMED';

                return (
                  <div
                    key={trace.step_number}
                    className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs font-mono hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/05">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px] shrink-0">
                          {trace.step_number}
                        </span>
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {trace.agent_name}
                        </span>
                        <span className="text-white/40 text-[11px]">({trace.agent_role})</span>
                      </div>
                      
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                          isTracePassed
                            ? 'bg-status-approved/15 text-status-approved border-status-approved/30'
                            : 'bg-status-review/15 text-status-review border-status-review/30'
                        }`}
                      >
                        {trace.status}
                      </span>
                    </div>

                    <p className="text-white/80 pl-7 text-xs leading-relaxed font-sans">
                      {trace.reasoning}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* 3. PINNED STICKY FOOTER                                     */}
        {/* ============================================================ */}
        <div className="border-t border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#0B111D] shrink-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-white/50 hidden sm:inline">
              Cryptographic SHA-256 Audit Link · Non-Repudiable Evidence
            </span>
            {activeTab === 'proof' && (
              <button
                onClick={() => setActiveTab('assistant')}
                className="text-xs font-mono text-accent hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all font-semibold"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask AI Assistant</span>
              </button>
            )}
          </div>
          
          <GlassButton size="sm" variant="secondary" onClick={onClose}>
            Close Inspector
          </GlassButton>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
