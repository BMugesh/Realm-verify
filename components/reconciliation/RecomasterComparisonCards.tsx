'use client';

import React from 'react';
import { Clock, AlertCircle, ArrowUpRight } from 'lucide-react';

interface MetricItemProps {
  label: string;
  value: string;
  hasBadge?: boolean;
  badgeColor?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({
  label,
  value,
  hasBadge = false,
  badgeColor = '#EF4444',
}) => {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-[#94A3B8] font-medium tracking-tight mb-1">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm sm:text-base font-bold text-[#0F172A] font-sans tracking-tight">
          {value}
        </span>
        {hasBadge && (
          <div
            className="w-3.5 h-3.5 rounded flex items-center justify-center text-white text-[9px] shrink-0"
            style={{ backgroundColor: badgeColor }}
          >
            <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
          </div>
        )}
      </div>
    </div>
  );
};

export const RecomasterComparisonCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ============================================================ */}
      {/* CARD 1: TODAY                                                */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8F0] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          {/* Header */}
          <h3 className="text-base font-bold text-[#0F172A] font-sans mb-5">
            Today
          </h3>

          {/* 6 Metrics Grid (3 cols x 2 rows) */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-4 mb-8">
            <MetricItem label="Reconciled" value="₹ 35,98,900" />
            <MetricItem label="Open Internal" value="₹ 35,900" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Internal" value="₹ 35,98,900" hasBadge badgeColor="#EF4444" />

            <MetricItem label="Reconciled" value="506" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Int Count" value="35,98,900" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Internal" value="35,98,900" hasBadge badgeColor="#EF4444" />
          </div>
        </div>

        {/* Chart Section */}
        <div className="pt-2">
          {/* Title */}
          <div className="text-center text-xs font-semibold text-[#334155] mb-3">
            Today's Trend
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 text-xs text-[#64748B] mb-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#5B46F6]" />
              <span className="text-[11px] font-medium">open internal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6B35]" />
              <span className="text-[11px] font-medium">open external</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488]" />
              <span className="text-[11px] font-medium">Reconcile</span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative h-44 w-full flex items-end">
            {/* Y-Axis Grid Lines & Labels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-[#94A3B8] font-sans">
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">40%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">40%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">20%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">20%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">0%</span>
                <div className="flex-1 border-b border-[#E2E8F0]" />
              </div>
            </div>

            {/* Bars */}
            <div className="ml-8 w-full h-full flex items-end justify-center pb-0 z-10">
              <div className="flex items-end justify-center gap-2.5 sm:gap-4 h-full pb-1">
                {/* Purple Bar: Open Internal */}
                <div className="w-7 sm:w-10 bg-[#5B46F6] rounded-t-md h-[25%] transition-all hover:opacity-90 hover:scale-105" />

                {/* Orange Bar: Open External */}
                <div className="w-7 sm:w-10 bg-[#FF6B35] rounded-t-md h-[55%] transition-all hover:opacity-90 hover:scale-105" />

                {/* Teal Bar: Reconcile */}
                <div className="w-7 sm:w-10 bg-[#0D9488] rounded-t-md h-[38%] transition-all hover:opacity-90 hover:scale-105" />
              </div>
            </div>
          </div>

          {/* X-Axis Label */}
          <div className="text-center text-[11px] text-[#94A3B8] font-medium mt-2">
            Today
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD 2: BACKLOG                                              */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2E8F0] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          {/* Header */}
          <h3 className="text-base font-bold text-[#0F172A] font-sans mb-5">
            Backlog
          </h3>

          {/* 6 Metrics Grid (3 cols x 2 rows) */}
          <div className="grid grid-cols-3 gap-y-5 gap-x-4 mb-8">
            <MetricItem label="Reconciled" value="₹ 35,900" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Int Amount" value="₹ 35,98,900" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Ext Amount" value="₹ 75,98,900" hasBadge badgeColor="#EF4444" />

            <MetricItem label="Reconciled" value="359" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Int Count" value="35,98,900" hasBadge badgeColor="#EF4444" />
            <MetricItem label="Open Ext Count" value="35,98,900" hasBadge badgeColor="#EF4444" />
          </div>
        </div>

        {/* Chart Section */}
        <div className="pt-2">
          {/* Title */}
          <div className="text-center text-xs font-semibold text-[#334155] mb-3">
            Backlog's Trend
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 text-xs text-[#64748B] mb-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#5B46F6]" />
              <span className="text-[11px] font-medium">open internal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488]" />
              <span className="text-[11px] font-medium">Reconcile</span>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="relative h-44 w-full flex items-end">
            {/* Y-Axis Grid Lines & Labels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-[#94A3B8] font-sans">
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">40%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">40%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">20%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">20%</span>
                <div className="flex-1 border-b border-[#F1F5F9]" />
              </div>
              <div className="flex items-center w-full">
                <span className="w-8 text-right pr-2">0%</span>
                <div className="flex-1 border-b border-[#E2E8F0]" />
              </div>
            </div>

            {/* Bars */}
            <div className="ml-8 w-full h-full flex items-end justify-center pb-0 z-10">
              <div className="flex items-end justify-center gap-3 sm:gap-5 h-full pb-1">
                {/* Purple Bar: Open Internal */}
                <div className="w-8 sm:w-12 bg-[#5B46F6] rounded-t-md h-[52%] transition-all hover:opacity-90 hover:scale-105" />

                {/* Teal Bar: Reconcile */}
                <div className="w-8 sm:w-12 bg-[#0D9488] rounded-t-md h-[34%] transition-all hover:opacity-90 hover:scale-105" />
              </div>
            </div>
          </div>

          {/* X-Axis Label */}
          <div className="text-center text-[11px] text-[#94A3B8] font-medium mt-2">
            Today
          </div>
        </div>
      </div>
    </div>
  );
};
