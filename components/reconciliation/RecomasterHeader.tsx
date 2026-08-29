'use client';

import React, { useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  Mail,
  Bell,
  ChevronDown,
  User,
  SlidersHorizontal,
} from 'lucide-react';

interface RecomasterHeaderProps {
  title?: string;
  onSearch?: (query: string) => void;
  onOpenStudio?: () => void;
}

export const RecomasterHeader: React.FC<RecomasterHeaderProps> = ({
  title = 'Dashboard',
  onSearch,
  onOpenStudio,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isDark, setIsDark] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="w-full flex items-center justify-between py-6 px-8 bg-transparent">
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] font-sans tracking-tight">
        {title}
      </h1>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex items-center">
          {searchOpen ? (
            <div className="relative flex items-center animate-fade-in">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3" />
              <input
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Search transactions, batches..."
                className="w-64 pl-9 pr-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] shadow-sm transition-all"
                autoFocus
                onBlur={() => {
                  if (!searchValue) setSearchOpen(false);
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="h-10 px-3 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all text-xs"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4" />}
          <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
        </button>

        {/* Messages */}
        <button
          onClick={onOpenStudio}
          className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
          title="Ingestion Messages & Logs"
        >
          <Mail className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenStudio}
          className="relative w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
          title="Notifications & Run Telemetry"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8B5CF6] ring-2 ring-white" />
        </button>

        {/* User Avatar Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D5F4E] text-white shadow-sm cursor-pointer hover:bg-[#0B4F41] transition-all">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
            <User className="w-4 h-4" />
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/80" />
        </div>
      </div>
    </header>
  );
};
