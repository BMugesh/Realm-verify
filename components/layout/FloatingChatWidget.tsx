'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  MessageSquare,
  X,
  ChevronDown,
  Sparkles,
  Maximize2,
  Minimize2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  ChevronUp,
} from 'lucide-react';
import { ExplainChatAssistant } from '../explainability/ExplainChatAssistant';
import { useCurrentRun } from '@/lib/RunContext';

const PIPELINE_AGENTS = [
  {
    id: 'ingest',
    name: 'Ingest Agent',
    role: 'Schema & Token Extraction',
    color: 'from-cyan-500 to-blue-600',
    icon: '⚡',
    prompt: 'What did the Ingest Agent parse for this record?',
  },
  {
    id: 'match',
    name: 'Match Agent',
    role: 'Combinatorial Bipartite Solver',
    color: 'from-blue-500 to-indigo-600',
    icon: '🧩',
    prompt: 'How did the Match Agent perform Stage 1 and Stage 2 matching?',
  },
  {
    id: 'semantic',
    name: 'Semantic Agent',
    role: 'NLP Reference & Ambiguity',
    color: 'from-indigo-500 to-purple-600',
    icon: '🧠',
    prompt: 'Did the Semantic Agent detect any noisy narrations or ambiguous candidates?',
  },
  {
    id: 'gatekeeper',
    name: 'Gatekeeper Agent',
    role: '0-Paise Accounting Validator',
    color: 'from-purple-500 to-pink-600',
    icon: '🛡️',
    prompt: 'What deterministic 0-paise checks did the Gatekeeper enforce?',
  },
  {
    id: 'auditor',
    name: 'Auditor Agent',
    role: 'SHA-256 Ledger Chaining',
    color: 'from-emerald-500 to-teal-600',
    icon: '📜',
    prompt: 'Show me the cryptographic SHA-256 evidence chain from the Auditor Agent.',
  },
];

export const FloatingChatWidget: React.FC = () => {
  const { currentRun } = useCurrentRun();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenWithAgent = (agentPrompt: string) => {
    setIsSpeedDialOpen(false);
    setIsOpen(true);
  };

  if (!mounted) return null;

  const widgetContent = (
    <div className="fixed bottom-6 right-6 z-[99999] pointer-events-none flex flex-col items-end">
      
      {/* ============================================================ */}
      {/* 1. EXPANDED SPEED-DIAL AGENT PILLS (Image 2 style)           */}
      {/* ============================================================ */}
      {isSpeedDialOpen && !isOpen && (
        <div className="pointer-events-auto mb-4 flex flex-col items-end gap-3 animate-fade-up">
          {PIPELINE_AGENTS.map((agent, idx) => (
            <div
              key={agent.id}
              onClick={() => handleOpenWithAgent(agent.prompt)}
              className="flex items-center gap-3 cursor-pointer group transition-all duration-200 hover:scale-105"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* White/Glass pill badge on the left */}
              <div className="px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-[#0E1726]/95 text-gray-900 dark:text-white text-xs font-mono font-bold shadow-lg border border-white/20 dark:border-white/10 group-hover:border-accent group-hover:text-accent transition-all backdrop-blur-md">
                <span>{agent.name}</span>
                <span className="text-[10px] text-white/50 block font-normal font-sans">
                  {agent.role}
                </span>
              </div>

              {/* Circular Avatar / Badge on the right */}
              <div
                className={`w-11 h-11 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-white text-base shadow-xl border-2 border-white/40 dark:border-white/20 group-hover:scale-110 transition-transform`}
              >
                {agent.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ANCHORED FLOATING CHAT POPUP WINDOW (Image 3 style)       */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          className={`pointer-events-auto mb-4 transition-all duration-300 ease-out flex flex-col ${
            isExpanded
              ? 'fixed inset-4 sm:inset-10 md:inset-16 max-w-5xl mx-auto my-auto h-[88vh] z-[99999]'
              : 'w-[94vw] sm:w-[420px] md:w-[450px] h-[580px] max-h-[calc(100vh-120px)] shadow-[0_20px_70px_rgba(0,0,0,0.85)] rounded-3xl'
          }`}
        >
          {/* Main Floating Glass Container */}
          <div className="relative w-full h-full flex flex-col rounded-3xl border border-white/20 bg-[#070D18]/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-fade-up">
            
            {/* Top Header Banner (Image 3 style: Purple/Indigo/Cyan Gradient) */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#4F46E5] via-[#3B82F6] to-[#06B6D4] text-white flex items-center justify-between shrink-0 shadow-md z-30">
              <div className="flex items-center gap-3">
                {/* Agent Avatar Circle */}
                <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  🤖
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white tracking-tight">
                      5-Agent Explain Assistant
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-sans text-white/90">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Live online · 0-paise proof</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Expand & Close */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Expand to full view'}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all text-xs"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsExpanded(false);
                  }}
                  title="Close Assistant"
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Assistant Core */}
            <div className="flex-1 min-h-0 relative">
              <ExplainChatAssistant
                runId={currentRun?.run_id}
                isEmbedded
                className="h-full rounded-none border-0 shadow-none bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MAIN CIRCULAR FLOATING ACTION BUTTON (FAB)                */}
      {/* ============================================================ */}
      <div className="pointer-events-auto relative group">
        
        {/* Outer Pulsing Aura Ring */}
        <div
          className={`absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#06B6D4] via-[#4F46E5] to-[#06B6D4] blur-md transition-all duration-300 ${
            isOpen ? 'opacity-80 scale-105' : 'opacity-40 group-hover:opacity-70 group-hover:scale-110 animate-pulse'
          }`}
        />

        {/* Circular Button */}
        <button
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setIsExpanded(false);
            } else if (isSpeedDialOpen) {
              setIsSpeedDialOpen(false);
            } else {
              setIsOpen(true);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsSpeedDialOpen(!isSpeedDialOpen);
          }}
          aria-label="Toggle Explain Assistant Chat"
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 border-2 ${
            isOpen
              ? 'bg-[#3B82F6] hover:bg-[#2563EB] border-white/50 text-white rotate-90'
              : 'bg-gradient-to-tr from-[#0B1322] via-[#0E1A30] to-[#15BCDF]/30 hover:from-[#15BCDF]/40 hover:to-[#0B1322] border-accent text-accent hover:text-white'
          }`}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white transition-transform" />
          ) : isSpeedDialOpen ? (
            <X className="w-7 h-7 text-accent transition-transform rotate-45" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-accent group-hover:scale-110 transition-transform" />
              {/* Green online badge */}
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#070D18] animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#070D18]" />
            </div>
          )}
        </button>

        {/* Mini Speed Dial Toggle Button next to FAB */}
        {!isOpen && (
          <button
            onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
            title="5-Agent Pipeline Quick Launch"
            className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] border-2 border-white/40 text-white text-xs flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(widgetContent, document.body);
};
