'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

interface RecomasterBankBarProps {
  selectedBank?: string;
  onBankChange?: (bank: string) => void;
  openInternal1?: string;
  openInternal2?: string;
  periodText?: string;
  onDateClick?: () => void;
}

export const RecomasterBankBar: React.FC<RecomasterBankBarProps> = ({
  selectedBank = 'ICIC Bank Pvt Ltd',
  onBankChange,
  openInternal1 = '$35,98,900',
  openInternal2 = '$35,98,900',
  periodText = 'Jan 21, 2022  →  Jan 21, 2022',
  onDateClick,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [repeatation, setRepeatation] = useState('Repeatation 12');

  const banks = [
    { name: 'ICIC Bank Pvt Ltd', code: 'ICICI' },
    { name: 'HDFC Bank Ltd', code: 'HDFC' },
    { name: 'Axis Bank Nodal', code: 'AXIS' },
    { name: 'State Bank of India', code: 'SBI' },
  ];

  return (
    <div className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
      {/* Left: Bank Logo & Name */}
      <div className="flex items-center gap-4 relative">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] flex items-center justify-center shrink-0 shadow-sm">
          {/* ICICI Style Logo Icon */}
          <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16C28 9.37 22.63 4 16 4Z"
              fill="#E11D48"
              fillOpacity="0.1"
            />
            <path
              d="M16 6C10.48 6 6 10.48 6 16C6 21.52 10.48 26 16 26C21.52 26 26 21.52 26 16C26 10.48 21.52 6 16 6ZM14.5 9.5C15.88 9.5 17 10.62 17 12C17 13.38 15.88 14.5 14.5 14.5C13.12 14.5 12 13.38 12 12C12 10.62 13.12 9.5 14.5 9.5ZM17.5 22.5H14.5V16.5H17.5V22.5Z"
              fill="#BE123C"
            />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] font-sans tracking-tight">
              {selectedBank}
            </h2>
          </div>

          <div className="relative mt-0.5">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 text-xs font-medium text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <span>{repeatation}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] py-2 z-30 animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Select Bank Account
                </div>
                {banks.map((b) => (
                  <button
                    key={b.code}
                    onClick={() => {
                      onBankChange?.(b.name);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                      selectedBank === b.name
                        ? 'bg-[#F0FDF4] text-[#0D9488] font-bold'
                        : 'text-[#334155] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span>{b.name}</span>
                    {selectedBank === b.name && <Check className="w-3.5 h-3.5 text-[#0D9488]" />}
                  </button>
                ))}
                <div className="border-t border-[#F1F5F9] my-1" />
                <div className="px-3 py-1 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Repeat Interval
                </div>
                {['Repeatation 12', 'Repeatation 24', 'Repeatation 36', 'Real-Time Stream'].map((rep) => (
                  <button
                    key={rep}
                    onClick={() => {
                      setRepeatation(rep);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-xs text-[#475569] hover:bg-[#F8FAFC]"
                  >
                    {rep}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Metric 1: Open Internal */}
      <div className="flex items-center justify-between lg:justify-start gap-4 px-2 sm:px-6 lg:border-l lg:border-[#F1F5F9]">
        <div>
          <div className="text-xs font-medium text-[#94A3B8] mb-0.5">Open Internal</div>
          <div className="text-lg sm:text-xl font-bold text-[#0F172A] font-sans tracking-tight">
            {openInternal1}
          </div>
        </div>

        {/* Circular Progress Gauge 1 */}
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
            {/* Background Track */}
            <path
              className="text-[#E2E8F0]"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Progress Arc */}
            <path
              className="text-[#0D9488]"
              strokeDasharray="75, 100"
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      </div>

      {/* Middle Metric 2: Open Internal */}
      <div className="flex items-center justify-between lg:justify-start gap-4 px-2 sm:px-6 lg:border-l lg:border-[#F1F5F9]">
        <div>
          <div className="text-xs font-medium text-[#94A3B8] mb-0.5">Open Internal</div>
          <div className="text-lg sm:text-xl font-bold text-[#0F172A] font-sans tracking-tight">
            {openInternal2}
          </div>
        </div>

        {/* Circular Progress Gauge 2 */}
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-[#E2E8F0]"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-[#0D9488]"
              strokeDasharray="75, 100"
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      </div>

      {/* Right: Reconcile Period Box */}
      <div className="flex flex-col gap-1.5 lg:border-l lg:border-[#F1F5F9] lg:pl-6">
        <span className="text-xs font-medium text-[#94A3B8]">Reconcile period</span>
        <button
          onClick={onDateClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-all text-xs font-semibold text-[#334155] shadow-sm"
        >
          <Calendar className="w-4 h-4 text-[#0D9488]" />
          <span>{periodText}</span>
        </button>
      </div>
    </div>
  );
};
