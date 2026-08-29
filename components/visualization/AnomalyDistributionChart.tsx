'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GlassCard } from '../glass/GlassCard';
import { GlassBadge } from '../glass/GlassBadge';

interface AnomalyDistributionChartProps {
  distribution?: {
    category: string;
    count: number;
    percentage: number;
    color: string;
  }[];
}

export const AnomalyDistributionChart: React.FC<AnomalyDistributionChartProps> = ({
  distribution,
}) => {
  const data = distribution || [
    { category: '1:1 Exact Ref', count: 182, percentage: 36.4, color: '#10B981' },
    { category: 'Fee Adjusted 1:1', count: 68, percentage: 13.6, color: '#15BCDF' },
    { category: 'Many:1 Batch', count: 54, percentage: 10.8, color: '#3B82F6' },
    { category: '1:Many Split', count: 38, percentage: 7.6, color: '#6366F1' },
    { category: 'Delayed (T+2/T+5)', count: 42, percentage: 8.4, color: '#8B5CF6' },
    { category: 'Noisy Bank Narration', count: 35, percentage: 7.0, color: '#EC4899' },
    { category: 'Near-Amount Ambiguity', count: 28, percentage: 5.6, color: '#F59E0B' },
    { category: 'Cross-Currency (USD)', count: 19, percentage: 3.8, color: '#EF4444' },
    { category: 'Missing Counterpart', count: 16, percentage: 3.2, color: '#DC2626' },
    { category: 'Others & Refunds', count: 18, percentage: 3.6, color: '#9CA3AF' },
  ];

  return (
    <GlassCard variant="elevated" className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="text-xs font-mono uppercase text-accent mb-1">
            ANOMALY CLASSIFICATION SPECTRUM
          </div>
          <h3 className="text-xl font-bold font-mono text-white uppercase">
            Dataset Anomaly Distribution
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Coverage of 13 edge cases across batch consolidation, split deposits, noisy references, and FX holdouts.
          </p>
        </div>
        <GlassBadge variant="accent" size="sm">
          13 ANOMALY TYPES RESOLVED
        </GlassBadge>
      </div>

      <div className="h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              type="number"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }}
            />
            <YAxis
              dataKey="category"
              type="category"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.8)' }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B111D',
                borderColor: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fff',
              }}
              formatter={(val: any, name: any, item: any) => [
                `${val} items (${item.payload.percentage}%)`,
                'Frequency',
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
};
