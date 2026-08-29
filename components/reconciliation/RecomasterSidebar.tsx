'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  PlayCircle,
  Grid2X2,
  Folder,
  CheckCircle2,
  Clock,
  Bookmark,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RecomasterSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenStudio?: () => void;
}

export const RecomasterSidebar: React.FC<RecomasterSidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenStudio,
}) => {
  const [recoToolsOpen, setRecoToolsOpen] = useState(true);

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'account_budget', label: 'Account Budget', icon: Wallet },
    { id: 'rate_card', label: 'Rate Card', icon: FileText },
  ];

  const recoTools = [
    { id: 'process_engine', label: 'Process Engine', icon: PlayCircle },
    { id: 'reco_ondemand', label: 'Reco Ondemand', icon: Grid2X2 },
    { id: 'file_splitter', label: 'File Splitter', icon: Folder },
    { id: 'allocation', label: 'Allocation', icon: CheckCircle2 },
    { id: 'reconciliation', label: 'Reconciliation', icon: Clock },
    { id: 'exception_manager', label: 'Exception Manager', icon: Bookmark },
  ];

  const bottomNav = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] min-h-screen flex flex-col justify-between p-6 select-none shrink-0 z-20">
      <div className="flex flex-col">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 mb-10 pl-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0D9488] to-[#10B981] flex items-center justify-center text-white shadow-sm ring-4 ring-[#0D9488]/10">
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19Z"
                opacity="0.3"
              />
              <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 14.5C10.62 14.5 9.5 13.38 9.5 12C9.5 10.62 10.62 9.5 12 9.5C13.38 9.5 14.5 10.62 14.5 12C14.5 13.38 13.38 14.5 12 14.5Z" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#0F172A] font-sans">
            Recomaster
          </span>
        </div>

        {/* Top Navigation */}
        <div className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'text-[#0D9488] bg-[#F0FDF4]/80'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                {isActive && (
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#0D9488] rounded-r-full" />
                )}
                <div
                  className={`w-5 h-5 flex items-center justify-center transition-colors ${
                    isActive ? 'text-[#0D9488]' : 'text-[#94A3B8] group-hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Reco Tools Section Header */}
        <div className="mt-8 mb-2">
          <button
            onClick={() => setRecoToolsOpen(!recoToolsOpen)}
            className="w-full flex items-center justify-between px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#475569] hover:text-[#0F172A]"
          >
            <span>Reco Tools</span>
            {recoToolsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#94A3B8]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            )}
          </button>
        </div>

        {/* Reco Tools Items */}
        {recoToolsOpen && (
          <div className="space-y-1 pl-1">
            {recoTools.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (item.id === 'process_engine' || item.id === 'reco_ondemand' || item.id === 'reconciliation') {
                      onOpenStudio?.();
                    }
                  }}
                  className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'text-[#0D9488] bg-[#F0FDF4]/80 font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-5 h-5 flex items-center justify-center transition-colors ${
                        isActive ? 'text-[#0D9488]' : 'text-[#94A3B8] group-hover:text-[#0F172A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Section (Analytics & Settings) */}
      <div className="space-y-1 pt-6 border-t border-[#F1F5F9]">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all group"
              >
                <div className="w-5 h-5 flex items-center justify-center text-[#94A3B8] group-hover:text-[#0F172A]">
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'text-[#0D9488] bg-[#F0FDF4]/80 font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center transition-colors ${
                  isActive ? 'text-[#0D9488]' : 'text-[#94A3B8] group-hover:text-[#0F172A]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
