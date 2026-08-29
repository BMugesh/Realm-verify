'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Database,
  Activity,
  FileCode2,
  Search,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassBadge } from '@/components/glass/GlassBadge';
import { AgentCard } from '@/components/agents/AgentCard';
import { ExplainModal } from '@/components/explainability/ExplainModal';
import { api } from '@/lib/api';
import { AgentTelemetry, DecisionExplanation } from '@/lib/types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentTelemetry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testSettlementId, setTestSettlementId] = useState<string>('PO_2303');
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [explaining, setExplaining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getAgentTelemetry();
      setAgents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agent status.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestExplain = async (idToTest?: string) => {
    const sId = idToTest || testSettlementId;
    if (!sId) return;
    setExplaining(true);
    try {
      const expl = await api.explainDecision(sId);
      setExplanation(expl);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explainability trace.');
    } finally {
      setExplaining(false);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1">
          <Bot className="w-4 h-4 text-accent" />
          <span>COOPERATIVE MULTI-AGENT RECONCILIATION SUITE</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
          AI Agents & Explainability
        </h1>
        <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
          Five specialized pipeline agents cooperating to discover candidates, validate accounting rules, and record hash-chained audit trails.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-unresolved/20 border border-status-unresolved/40 text-status-unresolved text-sm">
          {error}
        </div>
      )}

      {/* 5-Agent Architecture Spectrum */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {agents.map((agent) => (
          <AgentCard key={agent.agent_id} agent={agent} />
        ))}

        {/* Global Agent Consensus Card */}
        <GlassCard variant="elevated" className="p-6 border-status-approvedBorder bg-status-approvedBg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-status-approved uppercase font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-status-approved" />
              Agent Consensus Guarantee
            </div>
            <h3 className="text-lg font-bold font-mono text-white mb-2">
              Non-Negotiable Gatekeeper
            </h3>
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              No individual agent can unilaterally commit a financial decision. AI discovers candidate matches, while the deterministic Accounting Gatekeeper strictly validates gross - fees == net down to 0 paise.
            </p>
          </div>

          <div className="pt-4 border-t border-status-approvedBorder flex items-center justify-between text-xs font-mono text-status-approved font-semibold">
            <span>FALSE COMMIT RATE</span>
            <span>0.00% (ZERO PASS)</span>
          </div>
        </GlassCard>
      </div>

      {/* ============================================================ */}
      {/* EXPLAINABLE AI (XAI) LIVE DECISION INSPECTOR                 */}
      {/* ============================================================ */}
      <GlassCard variant="elevated" className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs font-mono uppercase text-accent mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              TRANSPARENT REASONING ENGINE
            </div>
            <h2 className="text-xl font-bold font-mono text-white uppercase">
              Explainable Decision Inspector
            </h2>
            <p className="text-xs text-white/60 mt-1">
              Select or enter any Settlement ID to inspect the step-by-step 5-Agent reasoning trajectory, token matches, and arithmetic ledger proof.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={testSettlementId}
              onChange={(e) => setTestSettlementId(e.target.value)}
              placeholder="e.g. PO_2303, PO_2327, PO_USR_BATCH_01..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <GlassButton
            variant="primary"
            size="md"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            loading={explaining}
            onClick={() => handleTestExplain()}
          >
            INSPECT AGENT REASONING
          </GlassButton>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-white/50 pl-2">
            <span>Quick Samples:</span>
            {['PO_2303', 'PO_2327', 'PO_2186', 'PO_USR_BATCH_01', 'PO_2297'].map((sId) => (
              <button
                key={sId}
                onClick={() => {
                  setTestSettlementId(sId);
                  handleTestExplain(sId);
                }}
                className="underline hover:text-accent font-semibold"
              >
                {sId}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Decision Explain Modal */}
      {explanation && (
        <ExplainModal explanation={explanation} onClose={() => setExplanation(null)} />
      )}
    </div>
  );
}
