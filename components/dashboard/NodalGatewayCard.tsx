'use client';

import React from 'react';
import { ShieldCheck, Wifi, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface NodalGatewayCardProps {
  poolTitle?: string;
  cardHolder?: string;
  runId?: string;
}

export const NodalGatewayCard: React.FC<NodalGatewayCardProps> = ({
  poolTitle = 'Razorpay Nodal Pool',
  cardHolder = 'Verified Enterprise Data',
  runId = 'USER_UPLOAD_RUN',
}) => {
  return (
    <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0D1424]/90 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between h-full min-h-[320px]">
      {/* Header (No dummy buttons) */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
            Gateway Nodal Accounts
          </span>
          <span className="text-[10px] font-mono text-accent/90">
            FinOps: Razorpay Escrow & Settlement Latency
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-emerald-400">● Active Pool</span>
      </div>

      {/* Frosted Metallic Nodal Settlement Card */}
      <div className="relative w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#9370DB]/80 via-[#7B68EE]/65 to-[#4B0082]/90 border border-white/20 shadow-xl overflow-hidden text-white my-auto">
        {/* Subtle holographic sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-50 pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-white/90" />
            <span className="text-xs font-mono font-bold tracking-wide truncate max-w-[180px]">{poolTitle}</span>
          </div>
          {/* Contactless symbol & Dual Circles */}
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 rotate-90 text-white/70" />
            <div className="flex -space-x-2">
              <div className="w-4 h-4 rounded-full bg-white/60" />
              <div className="w-4 h-4 rounded-full bg-white/40" />
            </div>
          </div>
        </div>

        {/* Card Number / Run ID */}
        <div className="text-sm sm:text-base font-mono font-bold tracking-wider text-white/95 my-2 truncate">
          {runId}
        </div>

        {/* Card Holder & Expiry */}
        <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-white/80 uppercase">
          <div>
            <div className="text-white/50 text-[8px]">Dataset Entity</div>
            <div className="font-semibold truncate max-w-[140px]">{cardHolder}</div>
          </div>
          <div className="text-right">
            <div className="text-white/50 text-[8px]">Audit Invariant</div>
            <div className="font-semibold text-emerald-400">0 PAISE</div>
          </div>
        </div>
      </div>

      {/* Footer link to studio */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/50">
        <span>Proof Bound</span>
        <Link href="/reconciliation" className="text-accent hover:underline flex items-center gap-1">
          <span>Reconciliation Studio</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
