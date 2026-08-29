'use client';

import React from 'react';
import { TrendingUp, ShieldCheck } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ReconciledBalanceCardProps {
  reconciledValue?: string;
  totalRecords?: number;
  trendData?: Array<{ day: string; amount: number; value: string }>;
}

const defaultTrendData = [
  { day: 'Sun', amount: 820, value: '₹820.00' },
  { day: 'Mon', amount: 1450, value: '₹1,450.00' },
  { day: 'Tue', amount: 1210, value: '₹1,210.00' },
  { day: 'Wed', amount: 2180, value: '₹2,180.00' },
  { day: 'Thu', amount: 1790, value: '₹1,790.00' },
  { day: 'Fri', amount: 2200, value: '₹2,200.00' },
  { day: 'Sat', amount: 2450, value: '₹2,450.00' },
];

export const ReconciledBalanceCard: React.FC<ReconciledBalanceCardProps> = ({
  reconciledValue = '₹2,450.00',
  totalRecords = 7,
  trendData,
}) => {
  const chartData = trendData && trendData.length > 0 ? trendData : defaultTrendData;

  return (
    <div className="relative p-6 sm:p-7 rounded-3xl bg-[#0D1424]/90 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between h-full min-h-[320px]">
      {/* Subtle cosmic background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
              Total Reconciled Balance
            </span>
            <span className="text-[10px] font-mono text-accent/90">
              FinOps: Net Cleared Volume & Settlement Velocity
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>0 Paise Residual</span>
          </span>
        </div>

        {/* Big Number & Growth Tag */}
        <div className="flex flex-wrap items-baseline gap-2.5 mb-2.5">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
            {reconciledValue}
          </h2>
          <span className="text-xs font-mono text-white/70 uppercase font-semibold">
            INR
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-status-approvedBg border border-status-approvedBorder text-status-approved shadow-glow-sm">
            <TrendingUp className="w-3 h-3" />
            <span>100% Balanced</span>
          </span>
          <span className="text-xs font-mono text-white/40">
            across {totalRecords} records
          </span>
        </div>
      </div>

      {/* Smooth Sleek Area Spline Chart (No cluttered Y-axis ticks) */}
      <div className="w-full h-36 mt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#15BCDF" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#15BCDF" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke="#ffffff30"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="monospace"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="px-3 py-1.5 rounded-lg bg-[#070B12] border border-accent/40 text-xs font-mono text-white shadow-xl">
                      <span className="text-accent font-bold">{payload[0].payload.day}: </span>
                      {payload[0].payload.value}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#15BCDF"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
