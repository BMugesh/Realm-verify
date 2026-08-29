'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface SettlementHeatmapMatrixProps {
  heatmapGrid?: number[][];
}

export const SettlementHeatmapMatrix: React.FC<SettlementHeatmapMatrixProps> = ({
  heatmapGrid: customGrid,
}) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = ['2pm', '1pm', '12am', '11am', '10am', '9am'];

  const defaultGrid = [
    [0, 2, 3, 3, 2, 0, 1], // 2pm
    [1, 3, 2, 3, 3, 2, 0], // 1pm
    [2, 1, 3, 3, 2, 3, 1], // 12am
    [0, 2, 2, 1, 3, 2, 0], // 11am
    [3, 3, 1, 2, 3, 3, 2], // 10am
    [1, 0, 2, 3, 2, 1, 0], // 9am
  ];

  const heatmapGrid = customGrid && customGrid.length === 6 ? customGrid : defaultGrid;

  const agents = [
    { name: 'Ingest', role: 'Parser', color: '#15BCDF', initial: 'IN' },
    { name: 'Match', role: 'Combinatorial', color: '#818CF8', initial: 'MA' },
    { name: 'Semantic', role: 'NLP', color: '#EC4899', initial: 'SE' },
    { name: 'Gatekeeper', role: '0-Paise Math', color: '#10B981', initial: 'GK' },
    { name: 'Auditor', role: 'SHA-256 Ledger', color: '#F59E0B', initial: 'AU' },
  ];

  return (
    <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0D1424]/90 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between h-full min-h-[380px]">
      {/* Header (No dummy dropdown) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
              Settlement Heatmap
            </span>
            <span className="text-[10px] font-mono text-accent/90">
              FinOps: Anomaly Clusters & Congestion Windows
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90">
            Hourly Matrix
          </span>
        </div>

        {/* Heat Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mb-3 pb-2 border-b border-white/05">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-white/10 border border-white/20" /> &gt;₹0
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#15BCDF]/40" /> &gt;₹500
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6366F1]" /> &gt;₹1000
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#15BCDF]" /> &gt;₹2000
          </span>
        </div>

        {/* 2D Grid Matrix */}
        <div className="space-y-1.5 my-2">
          {hours.map((hour, rIdx) => (
            <div key={hour} className="flex items-center gap-2">
              <span className="w-7 text-[9px] font-mono text-white/40 text-right shrink-0">
                {hour}
              </span>
              <div className="grid grid-cols-7 gap-1.5 flex-1">
                {days.map((day, cIdx) => {
                  const val = heatmapGrid[rIdx][cIdx];
                  let bgClass = 'bg-white/[0.04] border border-white/05';
                  if (val === 1) bgClass = 'bg-[#15BCDF]/35 border border-[#15BCDF]/40';
                  if (val === 2) bgClass = 'bg-[#6366F1]/70 border border-[#6366F1]/80';
                  if (val === 3) bgClass = 'bg-[#15BCDF] shadow-glow-sm';

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`h-4 rounded-md transition-all hover:scale-110 cursor-pointer ${bgClass}`}
                      title={`${day} ${hour}: Level ${val}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Days label row */}
          <div className="flex items-center gap-2 pt-1">
            <span className="w-7" />
            <div className="grid grid-cols-7 gap-1.5 flex-1 text-[9px] font-mono text-white/40 text-center">
              {days.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Swarm Section */}
      <div className="pt-4 border-t border-white/10 mt-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-mono font-medium text-white/70 uppercase">
            5-Agent Autonomous Swarm
          </span>
          <Link href="/agents" className="text-accent hover:underline text-[11px] font-mono flex items-center gap-1">
            <span>Inspect Team</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center -space-x-1.5">
          {agents.map((ag) => (
            <Link
              key={ag.name}
              href="/agents"
              className="relative group cursor-pointer"
              title={`${ag.name} Agent (${ag.role})`}
            >
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs text-white shadow-lg border-2 transition-transform group-hover:scale-110 group-hover:z-10"
                style={{
                  backgroundColor: `${ag.color}25`,
                  borderColor: ag.color,
                }}
              >
                {ag.initial}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-status-approved border border-black" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
