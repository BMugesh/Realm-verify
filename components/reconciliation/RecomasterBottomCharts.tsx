'use client';

import React, { useState } from 'react';

interface RecomasterBottomChartsProps {
  settledAmount?: string;
  matchingCount?: string;
  clearedBalanceCount?: string;
  differenceCount?: string;
}

export const RecomasterBottomCharts: React.FC<RecomasterBottomChartsProps> = ({
  settledAmount = '₹ 13,67,898',
  matchingCount = '8,085',
  clearedBalanceCount = '8,085',
  differenceCount = '8,085',
}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [selectedMonth, setSelectedMonth] = useState('May');

  const monthValues: Record<string, string> = {
    Jan: '₹ 8,42,100',
    Feb: '₹ 9,80,450',
    Mar: '₹ 11,20,000',
    Apr: '₹ 10,15,320',
    May: settledAmount,
    Jun: '₹ 12,40,900',
    Jul: '₹ 11,85,600',
    Aug: '₹ 14,10,200',
    Sep: '₹ 13,25,400',
    Oct: '₹ 15,90,000',
    Nov: '₹ 14,80,500',
    Dec: '₹ 16,50,000',
  };

  // Wave points across months (normalized y coordinates for SVG spline)
  // X: 0 to 600, Y: 0 to 160
  // May is at x=218, y=75
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
      {/* ============================================================ */}
      {/* LEFT CARD (8 COLS): SETTLED AMOUNT WAVY LINE CHART          */}
      {/* ============================================================ */}
      <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8F0] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden">
        {/* Main Chart Canvas with Left Y Labels */}
        <div className="flex items-stretch h-52 relative">
          {/* Y-Axis Repeated Subtle Labels from Mockup */}
          <div className="flex flex-col justify-between text-[10px] text-[#94A3B8] font-sans pr-4 select-none pb-5">
            <span>Jan</span>
            <span>Jan</span>
            <span>Jan</span>
            <span>Jan</span>
            <span>Jan</span>
            <span>Jan</span>
          </div>

          {/* SVG Smooth Spline Chart */}
          <div className="flex-1 relative flex items-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 160"
              preserveAspectRatio="none"
            >
              {/* Defs for glow and gradients */}
              <defs>
                <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#5B46F6" floodOpacity="0.25" />
                </filter>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#5B46F6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#5B46F6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Gradient Area Fill under the Wave */}
              <path
                d="M 30 100 C 50 115, 60 120, 75 120 C 95 120, 105 80, 120 80 C 145 80, 150 125, 170 125 C 195 125, 200 75, 220 75 C 245 75, 250 135, 270 135 C 295 135, 305 90, 320 90 C 345 90, 355 110, 370 110 C 395 110, 405 95, 420 95 C 445 95, 455 65, 470 65 C 495 65, 505 115, 520 115 C 545 115, 555 95, 570 95 L 570 160 L 30 160 Z"
                fill="url(#waveGradient)"
              />

              {/* Main Smooth Curved Spline Line */}
              <path
                d="M 30 100 C 50 115, 60 120, 75 120 C 95 120, 105 80, 120 80 C 145 80, 150 125, 170 125 C 195 125, 200 75, 220 75 C 245 75, 250 135, 270 135 C 295 135, 305 90, 320 90 C 345 90, 355 110, 370 110 C 395 110, 405 95, 420 95 C 445 95, 455 65, 470 65 C 495 65, 505 115, 520 115 C 545 115, 555 95, 570 95"
                fill="none"
                stroke="#5B46F6"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#purpleGlow)"
              />

              {/* Vertical Pointer Line to Active Tooltip */}
              <line
                x1={activePoint.x}
                y1="35"
                x2={activePoint.x}
                y2={activePoint.y}
                stroke="#5B46F6"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.6"
              />

              {/* Active Dot on Curve */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5.5"
                fill="#5B46F6"
                stroke="#FFFFFF"
                strokeWidth="3"
                className="transition-all duration-300"
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
              <div className="bg-white rounded-2xl px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E2E8F0] text-center min-w-[120px]">
                <div className="text-[10px] font-medium text-[#94A3B8]">Settled Amount</div>
                <div className="text-xs sm:text-sm font-bold text-[#0F172A] tracking-tight">
                  {monthValues[selectedMonth]}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Months X-Axis Labels (Clickable / Hoverable) */}
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-medium pl-10 pr-2 pt-3 border-t border-[#F1F5F9] select-none">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-1.5 py-0.5 rounded-lg transition-colors ${
                selectedMonth === m
                  ? 'text-[#5B46F6] font-bold bg-[#5B46F6]/10'
                  : 'hover:text-[#0F172A]'
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
      <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8F0] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row lg:flex-row items-center justify-between gap-6">
        {/* Left Column: 3 Concentric Ring Gauge Arcs */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
            {/* Outer Ring: Purple (13% - Matching) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#5B46F6"
              strokeWidth="5"
              strokeDasharray="180 251.2"
              strokeLinecap="round"
              className="transition-all duration-700"
            />

            {/* Middle Ring: Orange (25% - Difference) */}
            <circle
              cx="50"
              cy="50"
              r="28"
              fill="none"
              stroke="#FF6B35"
              strokeWidth="5"
              strokeDasharray="130 175.9"
              strokeLinecap="round"
              className="transition-all duration-700"
            />

            {/* Inner Ring: Teal (30% - Cleared Balance) */}
            <circle
              cx="50"
              cy="50"
              r="16"
              fill="none"
              stroke="#0D9488"
              strokeWidth="5"
              strokeDasharray="70 100.5"
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
        </div>

        {/* Right Column: Breakdown List */}
        <div className="flex flex-col justify-center space-y-4 w-full sm:w-auto flex-1 pl-2">
          {/* Row 1: Matching */}
          <div className="flex flex-col">
            <span className="text-xs text-[#94A3B8] font-medium mb-0.5">Matching</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-[#0F172A] font-sans">
                {matchingCount}
              </span>
              <span className="text-xs font-bold text-[#5B46F6]">13%</span>
            </div>
          </div>

          {/* Row 2: Cleared Balance */}
          <div className="flex flex-col">
            <span className="text-xs text-[#94A3B8] font-medium mb-0.5">Cleared Balance</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-[#0F172A] font-sans">
                {clearedBalanceCount}
              </span>
              <span className="text-xs font-bold text-[#0D9488]">30%</span>
            </div>
          </div>

          {/* Row 3: Difference */}
          <div className="flex flex-col">
            <span className="text-xs text-[#94A3B8] font-medium mb-0.5">Difference</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-[#0F172A] font-sans">
                {differenceCount}
              </span>
              <span className="text-xs font-bold text-[#FF6B35]">25%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
