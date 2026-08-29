'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface GoldenStep {
  step: number;
  label: string;
  shortTitle: string;
  href: string;
  duration: string;
  cue: string;
  metric: string;
}

const GOLDEN_STEPS: GoldenStep[] = [
  {
    step: 1,
    label: 'Landing Hero',
    shortTitle: '1. Hook',
    href: '/',
    duration: '20s',
    cue: 'Core Thesis: AI finds candidates. Mathematics decides. Evidence proves.',
    metric: '0-Paise Invariant Guarantee',
  },
  {
    step: 2,
    label: 'Finance Control Room',
    shortTitle: '2. Dashboard',
    href: '/dashboard',
    duration: '15s',
    cue: '5-second glance at live multi-ledger flow, settlement volume & clearing velocity.',
    metric: '73.6% Auto-Approved · 0% False Match',
  },
  {
    step: 3,
    label: 'Reconciliation Studio',
    shortTitle: '3. Studio & Run',
    href: '/reconciliation',
    duration: '45s',
    cue: 'Upload custom files or load enterprise batch. Run live 2-stage combinatorial solver.',
    metric: 'Stage 1 + Stage 2 Bipartite Matching',
  },
  {
    step: 4,
    label: 'XAI Explain Modal',
    shortTitle: '4. The Money Shot',
    href: '/reconciliation',
    duration: '40s',
    cue: 'Click "Explain" on any row: Reveal 0-paise mathematical proof & 5-agent consensus.',
    metric: 'Delta: 0 paise (Exact Invariant)',
  },
  {
    step: 5,
    label: 'Exceptions Queue',
    shortTitle: '5. Honest Quarantine',
    href: '/exceptions',
    duration: '30s',
    cue: 'Show zero hallucination: quarantine ambiguities with deterministic SOP action plans.',
    metric: 'Zero-Guesswork Human-in-the-Loop',
  },
  {
    step: 6,
    label: 'Deterministic Replay',
    shortTitle: '6. Prove it Twice',
    href: '/replay',
    duration: '30s',
    cue: 'Execute replay on historical audit: 0 decision flips, 0 paise deviation, identical hashes.',
    metric: '100% Bit-Exact Falsifiable Replay',
  },
];

export const GoldenPathBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Find active step index based on current pathname
  let currentStepIdx = GOLDEN_STEPS.findIndex((s) => s.href === pathname);
  if (currentStepIdx === -1) {
    if (pathname === '/dashboard') currentStepIdx = 1;
    else if (pathname === '/reconciliation') currentStepIdx = 2;
    else if (pathname === '/exceptions') currentStepIdx = 4;
    else if (pathname === '/replay') currentStepIdx = 5;
    else currentStepIdx = 0;
  }

  const activeStep = GOLDEN_STEPS[currentStepIdx];
  const nextStep = currentStepIdx < GOLDEN_STEPS.length - 1 ? GOLDEN_STEPS[currentStepIdx + 1] : null;
  const prevStep = currentStepIdx > 0 ? GOLDEN_STEPS[currentStepIdx - 1] : null;

  return (
    <aside aria-label="Demo Presentation Controller" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-4xl w-[95%] sm:w-auto">
      {/* Collapsed Pill Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel bg-[#0B111D]/90 border border-accent/40 shadow-glow-sm hover:border-accent hover:bg-[#0B111D] transition-all text-xs font-mono text-white group"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-bold text-accent">5-Screen Golden Demo Path</span>
          <span className="hidden sm:inline text-white/50">· Step {activeStep.step}/6 ({activeStep.shortTitle})</span>
          <ChevronRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-0.5 transition-transform" />
        </button>
      ) : (
        /* Expanded Golden Demo Bar */
        <div className="glass-panel bg-[#0B111D]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-accent/40 shadow-2xl p-4 sm:p-5 transition-all animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">
                Hackathon Golden Demo Rehearsal Mode
              </span>
              <span className="hidden md:inline px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold">
                Total Demo Target: ~3 min
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-[11px] font-mono text-white/60 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
              >
                {isMinimized ? 'Expand Guide' : 'Compact'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stepper Buttons (6 Steps) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
            {GOLDEN_STEPS.map((s, idx) => {
              const isCurrent = idx === currentStepIdx;
              const isPast = idx < currentStepIdx;
              return (
                <Link
                  key={s.step}
                  href={s.href}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isCurrent
                      ? 'bg-accent/20 border-accent text-white shadow-glow-sm font-bold'
                      : isPast
                      ? 'bg-white/[0.04] border-white/15 text-white/80 hover:bg-white/[0.08]'
                      : 'bg-white/[0.02] border-white/05 text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-[10px] font-mono font-semibold uppercase truncate w-full">
                    {s.shortTitle}
                  </span>
                  <span className="text-[9px] font-mono text-accent/80">{s.duration}</span>
                </Link>
              );
            })}
          </div>

          {/* Active Step Speaker Cue & Prompt */}
          {!isMinimized && (
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-xs mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-accent uppercase font-bold tracking-wider mb-0.5">
                  Speaker Talking Point (Target: {activeStep.duration}):
                </div>
                <div className="text-white/90 font-sans text-xs sm:text-sm leading-relaxed">
                  &ldquo;{activeStep.cue}&rdquo;
                </div>
              </div>
              <div className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{activeStep.metric}</span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs">
            {prevStep ? (
              <button
                onClick={() => router.push(prevStep.href)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous: {prevStep.shortTitle}</span>
              </button>
            ) : (
              <span />
            )}

            {nextStep ? (
              <button
                onClick={() => router.push(nextStep.href)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-accent text-background font-bold hover:bg-accent-hover transition-all shadow-glow-sm"
              >
                <span>Next: {nextStep.shortTitle}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-accent text-background font-bold hover:bg-accent-hover transition-all shadow-glow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Pitch (Step 1)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
