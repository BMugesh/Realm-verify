'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Lock, Hash } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-background-surface/40 backdrop-blur-xl mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wider text-white font-mono uppercase">
              REALM <span className="text-accent">VERIFY</span>
            </div>
            <div className="text-xs text-white/50">
              Evidence-Bound Multi-Ledger Reconciliation · Razorpay AI Buildathon 2026
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/60 font-mono">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-accent" />
            0 PAISE RESIDUAL
          </span>
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-accent" />
            SHA-256 HASH CHAINED
          </span>
          <Link href="/architecture" className="hover:text-accent transition-colors underline">
            Architecture Specs
          </Link>
        </div>

        <div className="text-xs text-white/40 font-mono text-center md:text-right">
          Strict Integer Minor Units · Zero False Commits
        </div>
      </div>
    </footer>
  );
};
