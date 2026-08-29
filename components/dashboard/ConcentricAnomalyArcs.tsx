'use client';

import React from 'react';
import { Layers } from 'lucide-react';

interface ArcCategory {
  label: string;
  amount: string;
  color: string;
  radius: number;
  stroke: number;
  dasharray: string;
}

interface ConcentricAnomalyArcsProps {
  totalCleared?: string;
  categories?: ArcCategory[];
}

const defaultCategories: ArcCategory[] = [
  { label: '1:1 Matches', amount: '₹450.00', color: '#15BCDF', radius: 82, stroke: 10, dasharray: '210 50' },
  { label: 'Many:1 Batches', amount: '₹2,000.00', color: '#818CF8', radius: 66, stroke: 9, dasharray: '170 50' },
  { label: 'Gateway Fees', amount: '₹49.00', color: '#EC4899', radius: 50, stroke: 8, dasharray: '130 50' },
  { label: 'Adjustments', amount: '₹73.50', color: '#38BDF8', radius: 34, stroke: 7, dasharray: '90 50' },
];

export const ConcentricAnomalyArcs: React.FC<ConcentricAnomalyArcsProps> = ({
  totalCleared = '₹2,450',
  categories,
}) => {
  const activeCategories = categories && categories.length > 0 ? categories : defaultCategories;

  return (
    <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0D1424]/90 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between h-full min-h-[320px]">
      {/* Header (No dummy buttons) */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
            Settlement Slices
          </span>
          <span className="text-[10px] font-mono text-accent/90">
            FinOps: Batch Concentration & Fee Leakage Detection
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90">
          Paise Arithmetic
        </span>
      </div>

      {/* Semicircular Concentric Arc Gauge */}
      <div className="relative flex items-center justify-center my-1">
        <svg viewBox="0 0 200 120" className="w-56 h-32 overflow-visible">
          <defs>
            <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arcs */}
          {activeCategories.map((c, i) => (
            <path
              key={`bg-${i}`}
              d={`M ${100 - c.radius} 105 A ${c.radius} ${c.radius} 0 0 1 ${100 + c.radius} 105`}
              fill="none"
              stroke="#ffffff10"
              strokeWidth={c.stroke}
              strokeLinecap="round"
            />
          ))}

          {/* Active Colored Arcs */}
          {activeCategories.map((c, i) => (
            <path
              key={`val-${i}`}
              d={`M ${100 - c.radius} 105 A ${c.radius} ${c.radius} 0 0 1 ${100 + c.radius} 105`}
              fill="none"
              stroke={c.color}
              strokeWidth={c.stroke}
              strokeLinecap="round"
              strokeDasharray={c.dasharray}
              filter="url(#arcGlow)"
              className="transition-all duration-1000 ease-out"
            />
          ))}
        </svg>

        {/* Center Total Text */}
        <div className="absolute bottom-2 text-center">
          <div className="text-lg sm:text-xl font-extrabold font-mono text-white tracking-tight">
            {totalCleared}
          </div>
          <div className="text-[10px] font-mono text-accent uppercase font-bold tracking-wider">
            Consensus Value
          </div>
        </div>
      </div>

      {/* 4-Item Legend Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-white/10 text-[11px] font-mono">
        {activeCategories.map((cat) => (
          <div key={cat.label} className="flex items-center justify-between gap-1.5 truncate">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-white/60 truncate">{cat.label}</span>
            </div>
            <span className="text-white font-semibold shrink-0 ml-1">{cat.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
