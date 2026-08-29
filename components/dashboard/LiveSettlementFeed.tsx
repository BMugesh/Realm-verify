'use client';

import React, { useState } from 'react';
import { Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { FeedItem } from '@/lib/types';

interface LiveSettlementFeedProps {
  feedItems?: FeedItem[];
  onSelectSettlement?: (settlementId: string) => void;
}

export const LiveSettlementFeed: React.FC<LiveSettlementFeedProps> = ({
  feedItems,
  onSelectSettlement,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AUTO_APPROVED' | 'REVIEW'>('ALL');
  const itemsToDisplay = feedItems || [];

  const filtered = itemsToDisplay.filter((item) => {
    if (filter === 'AUTO_APPROVED') return item.status === 'AUTO_APPROVED';
    if (filter === 'REVIEW') return item.status !== 'AUTO_APPROVED';
    return true;
  });

  return (
    <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0D1424]/90 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between h-full min-h-[380px]">
      {/* Header (No dummy plus button) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
              Reconciled History Stream
            </span>
            <span className="text-[10px] font-mono text-accent/90">
              FinOps: Click Any Row for 0-Paise XAI Mathematical Proof
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90">
            Real-Time Audit
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/05">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'AUTO_APPROVED', 'REVIEW'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-all ${
                  filter === tab
                    ? 'bg-white text-background shadow-md'
                    : 'text-white/60 hover:text-white bg-white/5'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'AUTO_APPROVED' ? 'Cleared' : 'Review'}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-white/40 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Feed ({filtered.length})</span>
          </span>
        </div>

        {/* List of Settlement Feeds (Clean layout without text truncation) */}
        <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectSettlement?.(item.id)}
              className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/05 hover:border-accent/30 transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              {/* Left Brand Avatar + Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center font-mono font-extrabold text-sm text-accent group-hover:scale-105 transition-transform shrink-0">
                  {item.sourceIcon || 'R'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono text-white truncate">
                      {item.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                        item.status === 'AUTO_APPROVED'
                          ? 'bg-status-approvedBg text-status-approved border border-status-approvedBorder'
                          : 'bg-status-reviewBg text-status-review border border-status-reviewBorder'
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-0.5 truncate">
                    {item.time}
                  </div>
                </div>
              </div>

              {/* Right Amount */}
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-extrabold text-white">
                  {item.amount}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-xs font-mono text-white/60">
        <span>Zero False Commits</span>
        <Link href="/reconciliation" className="text-accent hover:underline flex items-center gap-1 text-[11px]">
          <span>Open Full Studio</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
