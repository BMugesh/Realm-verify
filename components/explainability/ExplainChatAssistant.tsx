'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Activity,
  Layers,
  Flame,
  AlertCircle,
  X,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  History,
  CheckCircle2,
  ChevronRight,
  Brain,
  MessageCircle,
} from 'lucide-react';
import { StatusBadge } from '../glass/StatusBadge';
import { GlassButton } from '../glass/GlassButton';
import { api } from '@/lib/api';
import { ChatMessage, ChatResponse, DecisionStatus, ChatSessionItem } from '@/lib/types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ExplainChatAssistantProps {
  recordId: string;
  runId?: string;
  initialDecision?: DecisionStatus;
  initialConfidence?: number;
  onClose?: () => void;
  className?: string;
  isEmbedded?: boolean;
}

interface MessageItem extends ChatMessage {
  id: string;
  timestamp: string;
  citations?: ChatResponse['citations'];
  source?: string;
  session_id?: string;
  reward?: number | null;
  feedback_text?: string;
}

const QUICK_PROMPTS = [
  { label: 'Why unresolved?', prompt: 'Why is this reconciliation record unresolved or in review?' },
  { label: 'What is the residual?', prompt: "What is the exact 0-paise residual and balance difference for this record?" },
  { label: 'Show Evidence Hash', prompt: 'How do I know this result is accurate? Show the SHA-256 evidence ledger hash.' },
  { label: 'Candidate Matches', prompt: 'Show me the nearest candidate transaction and bank statement matches.' },
  { label: 'Should I approve?', prompt: 'Should this match be approved or overridden?' },
];

export const ExplainChatAssistant: React.FC<ExplainChatAssistantProps> = ({
  recordId,
  runId,
  initialDecision = 'AUTO_APPROVED',
  initialConfidence = 0.95,
  onClose,
  className = '',
  isEmbedded = false,
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [pastSessions, setPastSessions] = useState<ChatSessionItem[]>([]);
  const [learnedRules, setLearnedRules] = useState<string[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  // Feedback states
  const [activeFeedbackMsgId, setActiveFeedbackMsgId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsgId, setFeedbackSuccessMsgId] = useState<string | null>(null);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load persistent history from SQLite whenever recordId changes
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyData = await api.getChatHistory(recordId);
        if (historyData.sessions) {
          setPastSessions(historyData.sessions);
        }
        if (historyData.learned_rules) {
          setLearnedRules(historyData.learned_rules);
        }

        if (historyData.messages && historyData.messages.length > 0) {
          const formatted: MessageItem[] = historyData.messages.map((m) => ({
            id: m.id || `msg-${Date.now()}-${Math.random()}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: m.citations,
            source: m.source,
            session_id: m.session_id,
            reward: m.reward,
            feedback_text: m.feedback_text,
          }));
          setMessages(formatted);
          if (formatted[0]?.session_id) {
            setSessionId(formatted[0].session_id);
          }
        } else {
          // Default initial welcome
          setMessages([
            {
              id: 'welcome-msg',
              role: 'assistant',
              content: `Thank you for accessing **Realm Verify**. I am your dedicated **Reconciliation Explain Assistant** for record \`${recordId}\`.\n\nI am grounded strictly in the **5-agent pipeline telemetry**, deterministic **0-paise arithmetic proofs**, and the **SHA-256 evidence chain**. How may I assist you with this reconciliation record?`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      } catch (e) {
        // Fallback welcome message
        setMessages([
          {
            id: 'welcome-msg',
            role: 'assistant',
            content: `Thank you for accessing **Realm Verify**. I am your dedicated **Reconciliation Explain Assistant** for record \`${recordId}\`.\n\nI am grounded strictly in the **5-agent pipeline telemetry**, deterministic **0-paise arithmetic proofs**, and the **SHA-256 evidence chain**. How may I assist you with this reconciliation record?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    };

    loadHistory();
  }, [recordId, runId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: MessageItem = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      session_id: sessionId,
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendChatMessage({
        record_id: recordId,
        run_id: runId,
        message: text,
        session_id: sessionId,
        conversation_history: historyPayload,
      });

      if (res.session_id) {
        setSessionId(res.session_id);
      }
      if (res.learned_corrections) {
        setLearnedRules(res.learned_corrections);
      }

      const assistantMsg: MessageItem = {
        id: res.message_id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations,
        source: res.source,
        session_id: res.session_id,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to fetch answer: ${err.message || 'Network error'}. Please try again or inspect the Explain Modal directly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Submit Feedback (+1 / -1) and train self-correction policy
  const handleFeedback = async (message: MessageItem, reward: number, noteText?: string) => {
    try {
      setIsSubmittingFeedback(true);
      await api.submitChatFeedback({
        record_id: recordId,
        message_id: message.id,
        reward: reward,
        feedback_text: noteText || feedbackNote,
        response: message.content,
      });

      // Update message state locally
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, reward: reward, feedback_text: noteText || feedbackNote } : m
        )
      );

      // Refresh learned rules
      const updatedHistory = await api.getChatHistory(recordId);
      if (updatedHistory.learned_rules) {
        setLearnedRules(updatedHistory.learned_rules);
      }

      setFeedbackSuccessMsgId(message.id);
      setActiveFeedbackMsgId(null);
      setFeedbackNote('');
      setTimeout(() => setFeedbackSuccessMsgId(null), 3000);
    } catch (err) {
      console.error('Failed to submit feedback', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleResetThread = () => {
    const newSess = `sess_${Date.now()}`;
    setSessionId(newSess);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `New conversation thread initialized. Scoped to record \`${recordId}\`.\n\nAll subsequent questions and feedback will be recorded into the persistent evidence ledger. How can I help?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsHistoryDrawerOpen(false);
  };

  return (
    <div
      className={`flex flex-col h-full bg-[#070D18]/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl overflow-hidden ${className}`}
    >
      {/* ============================================================ */}
      {/* 1. TOP HEADER & RECORD SCOPE BAR                            */}
      {/* ============================================================ */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#0B1322] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(21,188,223,0.25)]">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-white tracking-tight">
                Explain Assistant
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live RL Policy Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/50 mt-0.5">
              <span>Record:</span>
              <code className="text-accent font-bold bg-white/05 px-1.5 py-0.2 rounded border border-white/10">
                {recordId}
              </code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History / Sessions Drawer Button */}
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            title="Conversation History & RL Corrections"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/05 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-mono transition-all"
          >
            <History className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">History</span>
            {messages.length > 1 && (
              <span className="w-4 h-4 rounded-full bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>

          {/* Reset Conversation Button */}
          <button
            onClick={handleResetThread}
            title="Start New Conversation Thread"
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/05 border border-transparent hover:border-white/10 transition-all text-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onClose && !isEmbedded && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/05 border border-transparent hover:border-white/10 transition-all text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. HISTORY & RL SELF-CORRECTION DRAWER (Slide-out)           */}
      {/* ============================================================ */}
      {isHistoryDrawerOpen && (
        <div className="bg-[#0A111F] border-b border-white/15 p-4 z-40 animate-fade-up max-h-56 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Brain className="w-4 h-4 text-accent" />
              <span>Persistent Chat History & RL Self-Correction Memory</span>
            </div>
            <button
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="text-white/40 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Learned RL Rules */}
          {learnedRules && learnedRules.length > 0 ? (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <div className="font-mono font-bold text-[11px] mb-1 text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Active Learned Operator Rules ({learnedRules.length}):
              </div>
              <ul className="space-y-1 list-disc pl-4 text-[11px] font-mono">
                {learnedRules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-white/40 mb-2">
              No mistakes flagged yet. Operator feedback signals (👍/👎) will automatically train the active correction policy.
            </div>
          )}

          {/* Saved Sessions */}
          <div className="text-[10px] font-mono uppercase text-white/40 mb-1.5 font-bold">
            Past Conversation Sessions:
          </div>
          <div className="space-y-1.5">
            {pastSessions.length > 0 ? (
              pastSessions.map((s) => (
                <div
                  key={s.session_id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/05 hover:bg-white/10 text-xs font-mono text-white/80 border border-white/05"
                >
                  <div className="truncate">
                    <span className="text-accent font-semibold">{s.title || s.session_id}</span>
                    <span className="text-[10px] text-white/40 block">
                      {new Date(s.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                    {s.message_count || 1} msgs
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-white/40 italic">Active session is currently the only recorded thread.</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MESSAGE STREAM                                            */}
      {/* ============================================================ */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Indicator */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30'
                    : 'bg-accent/20 text-accent border border-accent/30 shadow-[0_0_10px_rgba(21,188,223,0.2)]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm border transition-all ${
                  isUser
                    ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-white rounded-tr-none'
                    : 'bg-white/[0.04] border-white/10 text-white/90 rounded-tl-none'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/05 text-[10px] font-mono text-white/40">
                  <span className="font-semibold text-white/70">
                    {isUser ? 'Operator' : '5-Agent Explain Assistant'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Markdown Content */}
                <MarkdownRenderer content={msg.content} />

                {/* Citations & Evidence Hash Strip */}
                {!isUser && msg.citations && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white/40">Grounded in:</span>
                      {msg.citations.stages.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 text-[9px] font-bold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {msg.citations.evidence_ledger_hash && (
                      <button
                        onClick={() =>
                          copyToClipboard(msg.citations?.evidence_ledger_hash || '', msg.id)
                        }
                        title="Copy cryptographic SHA-256 evidence hash"
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/05 hover:bg-white/10 border border-white/10 text-white/60 hover:text-accent transition-colors"
                      >
                        <Lock className="w-3 h-3 text-accent" />
                        <span className="font-mono">
                          {msg.citations.evidence_ledger_hash.slice(0, 10)}...
                        </span>
                        {copiedMessageId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Reinforcement Learning (RL) Feedback Controls (Thumbs Up / Down) */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-white/05 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono text-white/40">
                      Reinforcement Learning Signal:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleFeedback(msg, 1)}
                        title="Accurate & Polite (Reward +1)"
                        className={`p-1 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                          msg.reward === 1
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                            : 'bg-white/05 hover:bg-emerald-500/10 text-white/50 hover:text-emerald-400 border-transparent hover:border-emerald-500/30'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {msg.reward === 1 && <span className="text-[9px]">Accurate</span>}
                      </button>

                      <button
                        onClick={() => setActiveFeedbackMsgId(activeFeedbackMsgId === msg.id ? null : msg.id)}
                        title="Mistake / Flag for Self-Correction (Reward -1)"
                        className={`p-1 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                          msg.reward === -1
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                            : 'bg-white/05 hover:bg-rose-500/10 text-white/50 hover:text-rose-400 border-transparent hover:border-rose-500/30'
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        {msg.reward === -1 && <span className="text-[9px]">Flagged</span>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Correction Note Input on Thumbs Down */}
                {activeFeedbackMsgId === msg.id && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#0E1726] border border-rose-500/30 animate-fade-up">
                    <div className="text-[11px] font-mono text-rose-300 font-bold mb-1">
                      Flag Mistake & Train Self-Correction Policy:
                    </div>
                    <textarea
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder="Explain the mistake or provide the ground truth correction note..."
                      rows={2}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder:text-white/30 focus:border-rose-400 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button
                        onClick={() => setActiveFeedbackMsgId(null)}
                        className="px-2 py-1 rounded text-[10px] font-mono text-white/50 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleFeedback(msg, -1)}
                        disabled={isSubmittingFeedback}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold shadow transition-all disabled:opacity-50"
                      >
                        {isSubmittingFeedback ? 'Training...' : 'Submit & Retrain Policy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {feedbackSuccessMsgId === msg.id && (
                  <div className="mt-2 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5 animate-fade-up">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>RL feedback recorded. Self-correction memory consolidated!</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent/20 text-accent border border-accent/30 flex items-center justify-center animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs font-mono text-white/60">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
              <span>Verifying multi-ledger facts and applying RL constraints...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================================ */}
      {/* 4. QUICK PROMPT PILLS                                        */}
      {/* ============================================================ */}
      <div className="px-4 sm:px-6 py-2.5 border-t border-white/10 bg-[#0B1322]/80 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-accent" /> Quick Prompts:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSendMessage(qp.prompt)}
            className="px-2.5 py-1 rounded-full bg-white/05 hover:bg-accent/15 border border-white/10 hover:border-accent/30 text-white/70 hover:text-accent font-mono text-[11px] shrink-0 transition-all disabled:opacity-40"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 5. BOTTOM INPUT BAR                                          */}
      {/* ============================================================ */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-[#070D18] shrink-0">
        <div className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={`Ask anything about record ${recordId}...`}
            className="w-full px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/15 focus:border-accent/60 focus:ring-1 focus:ring-accent/40 text-white text-xs sm:text-sm font-mono placeholder:text-white/30 outline-none transition-all pr-12 disabled:opacity-50"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-1.5 p-2 rounded-lg bg-accent text-brand-dark hover:bg-accent-hover disabled:opacity-30 disabled:hover:bg-accent transition-all flex items-center justify-center font-bold"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
