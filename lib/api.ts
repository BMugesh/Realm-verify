/**
 * Type-safe API client for Realm Verify FastAPI Backend.
 */
import {
  ReconciliationRunResponse,
  ReconciliationException,
  BenchmarkReport,
  EvidenceRun,
  EvidenceEvent,
  ReplayReport,
  AgentTelemetry,
  DecisionExplanation,
  UserDataUploadPayload,
  VisualAnalyticsData,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const err = await response.json();
      if (err.detail) errorDetail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Health & System
  getHealth: () => fetchJSON<{
    status: string;
    version: string;
    engine: string;
    math_mode: string;
    evidence_store_ready: boolean;
    total_recorded_runs: number;
    agents_online: number;
  }>('/health'),

  // Canonical Single Source of Truth Run Endpoints
  getCurrentRunSummary: () =>
    fetchJSON<{ has_run: boolean; summary: import('./types').RunSummary | null; error?: string }>('/runs/current/summary'),

  getRunSummary: (runId: string) =>
    fetchJSON<{ has_run: boolean; summary: import('./types').RunSummary }> (`/runs/${runId}/summary`),

  getAllRuns: () =>
    fetchJSON<{ runs: Array<{
      run_id: string;
      pipeline_type: string;
      dataset_name: string;
      created_at: string;
      total_source_records: number;
      reconciled_value_formatted: string;
      auto_approval_rate: number;
    }> }>('/runs'),

  // Reconciliation Engine Execution
  runRealmVerify: (seed: number = 42, records: number = 500) =>
    fetchJSON<ReconciliationRunResponse>('/reconciliation/run', {
      method: 'POST',
      body: JSON.stringify({ seed, records }),
    }),

  runBaseline: (seed: number = 42, records: number = 500) =>
    fetchJSON<ReconciliationRunResponse>('/reconciliation/baseline', {
      method: 'POST',
      body: JSON.stringify({ seed, records }),
    }),

  runCustomUpload: (payload: UserDataUploadPayload) =>
    fetchJSON<ReconciliationRunResponse>('/reconciliation/upload-run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getLatestReconciliation: () =>
    fetchJSON<import('./types').RunSummary>('/reconciliation/latest'),

  // Multi-Agent Telemetry & Explainability
  getAgentTelemetry: () => fetchJSON<AgentTelemetry[]>('/agents/status'),

  explainDecision: (settlementId: string) =>
    fetchJSON<DecisionExplanation>(`/reconciliation/explain/${settlementId}`, {
      method: 'POST',
    }),

  // Visual Analytics
  getVisualAnalytics: () => fetchJSON<VisualAnalyticsData>('/analytics/charts'),

  // Exceptions
  getExceptions: (params?: { run_id?: string; category?: string; query?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.run_id) searchParams.append('run_id', params.run_id);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.query) searchParams.append('query', params.query);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));
    const queryStr = searchParams.toString();
    return fetchJSON<{
      total: number;
      categories: string[];
      offset: number;
      limit: number;
      exceptions: ReconciliationException[];
    }>(`/exceptions${queryStr ? `?${queryStr}` : ''}`);
  },

  resolveException: (payload: { source_id: string; run_id?: string; resolution_action?: string; operator_notes?: string }) =>
    fetchJSON<{ success: boolean; source_id: string; updated_summary: import('./types').RunSummary; explanation: DecisionExplanation }>('/exceptions/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Evidence Ledger
  getEvidenceRuns: () => fetchJSON<{ runs: EvidenceRun[] }>('/evidence/runs'),

  getEvidenceEvents: (runId: string, limit: number = 100) =>
    fetchJSON<{
      run_id: string;
      integrity_verified: boolean;
      integrity_message: string;
      total_events: number;
      events: EvidenceEvent[];
    }>(`/evidence/runs/${runId}?limit=${limit}`),

  verifyEvidenceChain: (runId: string) =>
    fetchJSON<{
      run_id: string;
      is_valid: boolean;
      message: string;
      events_verified: number;
    }>(`/evidence/verify/${runId}`, { method: 'POST' }),

  // Deterministic Replay
  getReplayRuns: () => fetchJSON<{ runs: EvidenceRun[] }>('/replay/runs'),

  executeReplay: (runId: string) =>
    fetchJSON<{ success: boolean; report: ReplayReport }>(`/replay/${runId}`, {
      method: 'POST',
    }),

  // Benchmark
  getBenchmark: () => fetchJSON<BenchmarkReport>('/benchmark'),

  // Reconciliation Explain Assistant Chatbot & RL Feedback
  sendChatMessage: (payload: { run_id?: string; record_id: string; message: string; session_id?: string; conversation_history?: import('./types').ChatMessage[] }) =>
    fetchJSON<import('./types').ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getChatHistory: (recordId: string, limit: number = 50) =>
    fetchJSON<import('./types').ChatHistoryResponse>(`/chat/history/${encodeURIComponent(recordId)}?limit=${limit}`),

  submitChatFeedback: (payload: import('./types').ChatFeedbackPayload) =>
    fetchJSON<import('./types').ChatFeedbackResponse>('/chat/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRLStats: () =>
    fetchJSON<import('./types').RLStatsResponse>('/chat/rl/stats'),

  optimizeRLPolicy: () =>
    fetchJSON<{ status: string; active_rules_count: number; learned_rules: string[]; accuracy_rating: number }>('/chat/rl/optimize', {
      method: 'POST',
    }),

  // Zero Initial State & Run History & MongoDB Atlas
  clearCurrentRun: () =>
    fetchJSON<{ status: string; message: string }>('/runs/current', {
      method: 'DELETE',
    }),

  getReconciliationHistory: (limit: number = 50) =>
    fetchJSON<{
      total_runs: number;
      mongodb_status: { is_connected: boolean; cluster: string; username: string; database: string; last_error?: string };
      runs: Array<{
        run_id: string;
        pipeline_type: string;
        dataset_name: string;
        created_at: string;
        total_source_records: number;
        reconciled_value_formatted: string;
        unreconciled_value_formatted: string;
        payouts_gross_formatted: string;
        auto_approval_rate: number;
        auto_approved_count: number;
        needs_review_count: number;
        unresolved_count: number;
        exception_count: number;
        duration_seconds: number;
        status: string;
      }>;
    }>(`/reconciliation/history?limit=${limit}`),

  getMongoDBStatus: () =>
    fetchJSON<{ is_connected: boolean; cluster: string; username: string; database: string; last_error?: string }>('/mongodb/status'),
};

