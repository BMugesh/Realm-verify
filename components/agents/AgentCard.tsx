import React from 'react';
import { Bot, CheckCircle2, Activity, Cpu, ShieldCheck, Database, Layers } from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassBadge } from '../glass/GlassBadge';
import { AgentTelemetry } from '@/lib/types';

interface AgentCardProps {
  agent: AgentTelemetry;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const getIcon = (id: string) => {
    if (id.includes('INGEST')) return <Database className="w-5 h-5 text-accent" />;
    if (id.includes('MATCHER')) return <Layers className="w-5 h-5 text-[#3B82F6]" />;
    if (id.includes('SEMANTIC')) return <Cpu className="w-5 h-5 text-[#8B5CF6]" />;
    if (id.includes('GATEKEEPER')) return <ShieldCheck className="w-5 h-5 text-status-approved" />;
    return <Bot className="w-5 h-5 text-accent" />;
  };

  return (
    <GlassCard variant="elevated" className="p-6 flex flex-col justify-between hover:border-accent/40">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              {getIcon(agent.agent_id)}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">{agent.name}</h3>
              <div className="text-xs text-white/50 font-sans">{agent.role}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-approved animate-pulse" />
            <span className="text-[11px] font-mono font-semibold text-status-approved">
              {agent.status}
            </span>
          </div>
        </div>

        <p className="text-xs text-white/70 leading-relaxed font-sans mb-6">
          {agent.description}
        </p>
      </div>

      <div className="pt-4 border-t border-white/10 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
            <div className="text-white/40 text-[10px]">RECORDS PROCESSED</div>
            <div className="text-sm font-bold text-white mt-0.5">{agent.records_processed}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
            <div className="text-white/40 text-[10px]">CONFIDENCE SCORE</div>
            <div className="text-sm font-bold text-accent mt-0.5">
              {(agent.confidence_score * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="pt-1 flex flex-wrap gap-2">
          {Object.entries(agent.key_metrics).map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70"
            >
              {k}: <strong className="text-accent">{v}</strong>
            </span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};
