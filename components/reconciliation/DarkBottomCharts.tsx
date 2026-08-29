'use client';

import React, { useState, useEffect } from 'react';
import { ReconciliationMetrics, RunSummary } from '@/lib/types';
import { UploadedSourceSummary } from './CustomDataUpload';

interface DarkBottomChartsProps {
  metrics?: ReconciliationMetrics | null;
  sourceSummary?: UploadedSourceSummary | null;
  runSummary?: RunSummary | null;
  totalRecords?: number;
  activeSettledValue?: string;
}

export const DarkBottomCharts: React.FC<DarkBottomChartsProps> = ({
  metrics,
  sourceSummary,
  runSummary,
  totalRecords = 0,
  activeSettledValue,
}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Set default selected month to run's primary month if available
  const initialMonth = runSummary?.primary_month || sourceSummary?.primaryMonth || 'Aug';
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  useEffect(() => {
    if (runSummary?.primary_month) {
      setSelectedMonth(runSummary.primary_month);
    } else if (sourceSummary?.primaryMonth) {
      setSelectedMonth(sourceSummary.primaryMonth);
    }
  }, [runSummary?.primary_month, sourceSummary?.primaryMonth]);

  // Real calculations directly from user data
  const matchRatePct = runSummary ? Math.round(runSummary.match_rate * 100) : (metrics ? Math.round((metrics.match_rate ?? 1.0) * 100) : 100);
  const clearedRatePct = runSummary ? Math.round(runSummary.auto_approval_rate * 100) : (metrics ? Math.round(metrics.auto_approval_rate * 100) : 100);
  const diffRatePct = runSummary ? Math.round(runSummary.exception_rate * 100) : (metrics ? Math.round(metrics.exception_rate * 100) : 0);

  const totalMatchedEntities = runSummary?.payouts_count ?? (metrics
    ? (metrics.auto_approved_count + metrics.needs_review_count)
    : (sourceSummary?.payoutsCount || totalRecords));

  const clearedCount = runSummary?.auto_approved_count ?? metrics?.auto_approved_count ?? 0;
  const diffCount = runSummary ? (runSummary.needs_review_count + runSummary.unresolved_count) : ((metrics?.needs_review_count ?? 0) + (metrics?.unresolved_count ?? 0));

  const primarySettled = activeSettledValue || runSummary?.reconciled_value_formatted || metrics?.reconciled_value_formatted || '₹0.00';

  // Build monthly values strictly from user dataset or active metrics
  const monthValues: Record<string, string> = {
    Jan: '₹ 0.00',
    Feb: '₹ 0.00',
    Mar: '₹ 0.00',
    Apr: '₹ 0.00',
    May: '₹ 0.00',
    Jun: '₹ 0.00',
    Jul: '₹ 0.00',
    Aug: '₹ 0.00',
    Sep: '₹ 0.00',
    Oct: '₹ 0.00',
    Nov: '₹ 0.00',
    Dec: '₹ 0.00',
  };

  if (runSummary?.monthly_settlements) {
    Object.assign(monthValues, runSummary.monthly_settlements);
  } else if (sourceSummary?.monthlySettlements) {
    Object.assign(monthValues, sourceSummary.monthlySettlements);
  } else {
    // If no custom month distribution exists, assign the active reconciled value to the active month
    monthValues[selectedMonth] = primarySettled;
  }

  const wavePoints = [
    { x: 30, y: 100, month: 'Jan' },
    { x: 75, y: 120, month: 'Feb' },
    { x: 120, y: 80, month: 'Mar' },
    { x: 170, y: 125, month: 'Apr' },
    { x: 220, y: 75, month: 'May' },
    { x: 270, y: 135, month: 'Jun' },
    { x: 320, y: 90, month: 'Jul' },
    { x: 370, y: 110, month: 'Aug' },
    { x: 420, y: 95, month: 'Sep' },
    { x: 470, y: 65, month: 'Oct' },
    { x: 520, y: 115, month: 'Nov' },
    { x: 570, y: 95, month: 'Dec' },
  ];

  const activePoint = wavePoints.find((p) => p.month === selectedMonth) || wavePoints[4];

  // SVG Arc calculation for concentric rings
  const outerCircumference = 2 * Math.PI * 40; // 251.3
  const middleCircumference = 2 * Math.PI * 28; // 175.9
  const innerCircumference = 2 * Math.PI * 16; // 100.5

  const outerDash = Math.max(0.1, (matchRatePct / 100) * outerCircumference);
  const middleDash = Math.max(0.1, (diffRatePct / 100) * middleCircumference);
  const innerDash = Math.max(0.1, (clearedRatePct / 100) * innerCircumference);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
      {/* ============================================================ */}
      {/* LEFT CARD (8 COLS): SETTLED AMOUNT WAVY LINE CHART          */}
      {/* ============================================================ */}
      <div className="lg:col-span-8 glass-card rounded-3xl p-6 sm:p-7 border border-white/10 shadow-glass-card flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-64 h-32 bg-accent/05 blur-3xl pointer-events-none" />

        {/* Main Chart Canvas with Left Y Labels */}
        <div className="flex items-stretch h-52 relative">
          {/* Y-Axis Subtle Grid Indicators */}
          <div className="flex flex-col justify-between text-[10px] text-white/30 font-mono pr-4 select-none pb-5">
            <span>MAX</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
            <span>MIN</span>
          </div>

          {/* SVG Smooth Spline Chart */}
          <div className="flex-1 relative flex items-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 160"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="darkGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#15BCDF" floodOpacity="0.4" />
                </filter>
                <linearGradient id="darkWaveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#15BCDF" stopOpacity="0.2" />
                  <stop offset="60%" stopColor="#818CF8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#15BCDF" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Gradient Area Fill under the Wave */}
              <path
                d="M 30 100 C 50 115, 60 120, 75 120 C 95 120, 105 80, 120 80 C 145 80, 150 125, 170 125 C 195 125, 200 75, 220 75 C 245 75, 250 135, 270 135 C 295 135, 305 90, 320 90 C 345 90, 355 110, 370 110 C 395 110, 405 95, 420 95 C 445 95, 455 65, 470 65 C 495 65, 505 115, 520 115 C 545 115, 555 95, 570 95 L 570 160 L 30 160 Z"
                fill="url(#darkWaveGradient)"
              />

              {/* Main Smooth Curved Spline Line */}
              <path
                d="M 30 100 C 50 115, 60 120, 75 120 C 95 120, 105 80, 120 80 C 145 80, 150 125, 170 125 C 195 125, 200 75, 220 75 C 245 75, 250 135, 270 135 C 295 135, 305 90, 320 90 C 345 90, 355 110, 370 110 C 395 110, 405 95, 420 95 C 445 95, 455 65, 470 65 C 495 65, 505 115, 520 115 C 545 115, 555 95, 570 95"
                fill="none"
                stroke="#15BCDF"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#darkGlow)"
              />

              {/* Vertical Pointer Line to Active Tooltip */}
              <line
                x1={activePoint.x}
                y1="35"
                x2={activePoint.x}
                y2={activePoint.y}
                stroke="#15BCDF"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.7"
              />

              {/* Active Dot on Curve */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#15BCDF"
                stroke="#070B12"
                strokeWidth="3"
                className="transition-all duration-300 shadow-glow-sm"
              />
            </svg>

            {/* Floating Card Tooltip above the Active Point */}
            <div
              className="absolute pointer-events-none transition-all duration-300 transform -translate-x-1/2"
              style={{
                left: `${(activePoint.x / 600) * 100}%`,
                top: '5px',
              }}
            >
              <div className="glass-panel rounded-2xl px-4 py-2 shadow-glass-pill border border-accent/40 text-center min-w-[130px] animate-fade-in">
                <div className="text-[10px] font-mono uppercase text-white/50">Settled Amount</div>
                <div className="text-xs sm:text-sm font-bold font-mono text-accent tracking-tight">
                  {monthValues[selectedMonth]}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Months X-Axis Labels */}
        <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pl-10 pr-2 pt-3 border-t border-white/05 select-none">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-1.5 py-0.5 rounded-lg transition-all ${
                selectedMonth === m
                  ? 'text-accent font-bold bg-accent/15 border border-accent/30 shadow-glow-sm'
                  : 'hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT CARD (4 COLS): CONCENTRIC MULTI-RING DONUT & METRICS  */}
      {/* ============================================================ */}
      <div className="lg:col-span-4 glass-card rounded-3xl p-6 sm:p-7 border border-white/10 shadow-glass-card flex flex-col sm:flex-row lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/05 blur-2xl pointer-events-none" />

        {/* Left Column: 3 Concentric Ring Gauge Arcs */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
            {/* Background Tracks */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />

            {/* Outer Ring: Purple/Indigo (Matching) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#818CF8"
              strokeWidth="5"
              strokeDasharray={`${outerDash} ${outerCircumference}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />

            {/* Middle Ring: Coral (Difference) */}
            <circle
              cx="50"
              cy="50"
              r="28"
              fill="none"
              stroke="#FB923C"
              strokeWidth="5"
              strokeDasharray={`${middleDash} ${middleCircumference}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />

            {/* Inner Ring: Cyan/Teal (Cleared Balance) */}
            <circle
              cx="50"
              cy="50"
              r="16"
              fill="none"
              stroke="#10B981"
              strokeWidth="5"
              strokeDasharray={`${innerDash} ${innerCircumference}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
        </div>

        {/* Right Column: Breakdown List - 100% computed from User Data */}
        <div className="flex flex-col justify-center space-y-4 w-full sm:w-auto flex-1 pl-2 font-mono">
          {/* Row 1: Matching */}
          <div className="flex flex-col">
            <span className="text-xs text-white/50 uppercase mb-0.5">Matching</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-white">
                {totalMatchedEntities.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#818CF8]">
                {matchRatePct}%
              </span>
            </div>
          </div>

          {/* Row 2: Cleared Balance */}
          <div className="flex flex-col">
            <span className="text-xs text-white/50 uppercase mb-0.5">Cleared Balance</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-white">
                {clearedCount.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-status-approved">
                {clearedRatePct}%
              </span>
            </div>
          </div>

          {/* Row 3: Difference */}
          <div className="flex flex-col">
            <span className="text-xs text-white/50 uppercase mb-0.5">Difference</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-white">
                {diffCount.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-status-review">
                {diffRatePct}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
