/**
 * TypeScript data models for Realm Verify matching the Python core models.
 */

export type DecisionStatus = 'AUTO_APPROVED' | 'NEEDS_REVIEW' | 'UNRESOLVED';

export type AnomalyCategory =
  | 'EXACT_MATCH_1TO1'
  | 'FEE_ADJUSTED_1TO1'
  | 'MANY_TO_ONE_BATCH'
  | 'ONE_TO_MANY_SPLIT'
  | 'DELAYED_SETTLEMENT'
  | 'NOISY_REFERENCE'
  | 'PARTIAL_REFUND_REVERSAL'
  | 'DUPLICATE_NEAR_AMOUNT'
  | 'AMBIGUOUS_CANDIDATE'
  | 'MISSING_COUNTERPART'
  | 'AMOUNT_MISMATCH'
  | 'MALFORMED_RECORD'
  | 'CROSS_CURRENCY';

export interface Stage1Link {
  payout_id: string;
  transaction_ids: string[];
  total_gross_minor: number;
  payout_gross_minor: number;
  is_balanced: boolean;
  score: number;
}

export interface Stage2Link {
  payout_id: string;
  bank_entry_ids: string[];
  total_credit_minor: number;
  payout_net_minor: number;
  is_balanced: boolean;
  score: number;
}

export interface ReconciliationResult {
  settlement_id: string;
  decision: DecisionStatus;
  confidence_score: number;
  stage1?: Stage1Link | null;
  stage2?: Stage2Link | null;
  failure_reasons: string[];
  audit_timestamp: string;
}

export interface ReconciliationException {
  exception_id: string;
  source_id: string;
  decision: DecisionStatus;
  category: string;
  amount_minor: number;
  currency: string;
  amount_formatted: string;
  reason: string;
  recommended_action: string;
  created_at: string;
}

export interface ReconciliationMetrics {
  run_id?: string;
  pipeline_type?: string;
  seed?: number;
  dataset_name?: string;
  total_source_records: number;
  total_settlement_entities?: number;
  runtime_seconds: number;
  processing_latency_ms?: number;
  latency_ms_per_entity?: number;
  records_per_second: number;
  records_per_minute?: number;
  settlement_groups_per_second?: number;
  match_rate?: number;
  automation_coverage?: number;
  stage1_precision?: number;
  stage1_recall?: number;
  stage1_f1: number;
  stage2_precision?: number;
  stage2_recall?: number;
  stage2_f1: number;
  end_to_end_precision?: number;
  end_to_end_recall?: number;
  end_to_end_f1: number;
  auto_approved_count: number;
  needs_review_count: number;
  unresolved_count: number;
  auto_approval_rate: number;
  review_with_candidate_rate?: number;
  unresolved_rate?: number;
  exception_rate: number;
  invalid_committed_matches: number;
  invalid_committed_match_rate: number;
  false_match_rate?: number;
  max_balance_residual_minor: number;
  max_committed_balance_residual_minor?: number;
  reconciled_value_minor: number;
  unreconciled_value_minor: number;
  reconciled_value_formatted: string;
  unreconciled_value_formatted: string;
}

export interface SettlementSlice {
  label: string;
  amount: string;
  raw_minor: number;
  color: string;
  radius: number;
  stroke: number;
  dasharray: string;
  count: number;
}

export interface TrendPoint {
  day: string;
  amount: number;
  value: string;
}

export interface VolumeEntity {
  count: number;
  gross_formatted: string;
  raw_minor: number;
  fees_formatted?: string;
  net_formatted?: string;
  credit_formatted?: string;
}

export interface VolumeFlowSummary {
  internal_transactions: VolumeEntity;
  gateway_payouts: VolumeEntity;
  bank_credits: VolumeEntity;
  matched_reconciled: { count: number; percentage: number; reconciled_val: string };
  flagged_exceptions: { count: number; percentage: number; unreconciled_val: string };
}

export interface FeedItem {
  id: string;
  gateway: string;
  sourceIcon: string;
  status: 'AUTO_APPROVED' | 'NEEDS_REVIEW' | 'UNRESOLVED' | string;
  statusLabel: string;
  time: string;
  amount: string;
  isCredit: boolean;
}

export interface RunSummary {
  run_id: string;
  pipeline_type: string;
  dataset_name: string;
  created_at: string;
  total_source_records: number;
  runtime_seconds: number;
  records_per_second: number;
  settlement_groups_per_second: number;
  
  // Ledger specific breakdown
  txns_count: number;
  txns_gross_minor: number;
  txns_gross_formatted: string;
  payouts_count: number;
  payouts_gross_minor: number;
  payouts_gross_formatted: string;
  payouts_net_minor: number;
  payouts_net_formatted: string;
  payouts_fee_minor: number;
  payouts_fee_formatted: string;
  banks_count: number;
  banks_credit_minor: number;
  banks_credit_formatted: string;
  primary_bank_name?: string;
  detected_banks?: string[];
  
  // Decisions
  auto_approved_count: number;
  needs_review_count: number;
  unresolved_count: number;
  auto_approval_rate: number;
  exception_rate: number;
  match_rate: number;
  
  // Balances
  reconciled_value_minor: number;
  reconciled_value_formatted: string;
  unreconciled_value_minor: number;
  unreconciled_value_formatted: string;
  max_balance_residual_minor: number;
  invalid_committed_matches: number;
  
  // F1 & Benchmark metrics
  stage1_f1: number;
  stage2_f1: number;
  end_to_end_f1: number;
  
  // Rich UI Telemetry
  settlement_slices: SettlementSlice[];
  trend_chart_data: TrendPoint[];
  volume_flow: VolumeFlowSummary;
  monthly_settlements: Record<string, string>;
  primary_month: string;
  date_range: string;
  heatmap_density: number[][];
  feed_items: FeedItem[];
  sample_results: ReconciliationResult[];
  exceptions: ReconciliationException[];
}

export interface ReconciliationRunResponse {
  success: boolean;
  run_id: string;
  pipeline_type: string;
  seed?: number;
  records?: number;
  summary?: RunSummary;
  metrics: ReconciliationMetrics;
  results_count: number;
  exceptions_count: number;
  sample_results: ReconciliationResult[];
  sample_exceptions: ReconciliationException[];
}

export interface UserDataUploadPayload {
  internal_transactions: Record<string, any>[];
  gateway_payouts: Record<string, any>[];
  bank_statements: Record<string, any>[];
  dataset_name?: string;
}

export interface BenchmarkAggregate {
  end_to_end_f1: string;
  stage1_f1: string;
  stage1_precision?: string;
  stage1_recall?: string;
  stage2_f1: string;
  stage2_precision?: string;
  stage2_recall?: string;
  auto_approval_rate: string;
  exception_rate: string;
  invalid_committed_match_rate: string;
  records_per_second: string;
  settlement_groups_per_second?: string;
}

export interface BenchmarkRun {
  seed: number;
  records: number;
  metrics: ReconciliationMetrics;
}

export interface BenchmarkReport {
  timestamp: string;
  seeds: number[];
  records_per_seed: number;
  baseline_aggregate: BenchmarkAggregate;
  realm_verify_aggregate: BenchmarkAggregate;
  realm_verify_runs: BenchmarkRun[];
  baseline_runs: BenchmarkRun[];
}

export interface EvidenceRun {
  run_id: string;
  dataset_seed: number;
  pipeline_type: string;
  total_records: number;
  created_at: string;
}

export interface EvidenceEvent {
  event_index: number;
  run_id: string;
  record_id: string;
  decision: string;
  validator_results: {
    payout_equation_valid?: boolean;
    gross_sum_valid?: boolean;
    net_sum_valid?: boolean;
    date_order_valid?: boolean;
    currency_policy_valid?: boolean;
    unique_allocation_valid?: boolean;
    confidence_margin_valid?: boolean;
    [key: string]: boolean | undefined;
  };
  payload: Record<string, any>;
  previous_event_hash: string;
  event_hash: string;
  timestamp: string;
}

export interface ReplayReport {
  run_id: string;
  timestamp: string;
  source_data_hashes_match: boolean;
  hash_chain_integrity: {
    verified: boolean;
    events_verified: number;
    message: string;
  };
  decision_determinism: {
    total_decisions: number;
    exact_decision_matches: number;
    match_percentage: number;
    max_balance_residual_deviation_minor: number;
    replay_status: string;
  };
}

export interface AgentTelemetry {
  agent_id: string;
  name: string;
  role: string;
  status: string;
  records_processed: number;
  confidence_score: number;
  key_metrics: Record<string, any>;
  description: string;
}

export interface DecisionStepTrace {
  step_number: number;
  agent_name: string;
  agent_role: string;
  status: string;
  reasoning: string;
  evidence_data: Record<string, any>;
}

export interface DecisionExplanation {
  settlement_id: string;
  decision: DecisionStatus;
  confidence_score: number;
  summary_verdict: string;
  arithmetic_proof: {
    payout_gross_paise: number;
    payout_gross_formatted: string;
    matched_transactions_gross_paise: number;
    matched_transactions_gross_formatted: string;
    stage1_gross_balance_delta: number;
    payout_net_paise: number;
    payout_net_formatted: string;
    bank_credits_sum_paise: number;
    bank_credits_sum_formatted: string;
    stage2_net_balance_delta: number;
    equation_balanced: boolean;
  };
  agent_consensus: Record<string, boolean>;
  step_traces: DecisionStepTrace[];
  recommended_action?: string;
}

export interface VisualAnalyticsData {
  anomaly_distribution: {
    category: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  settlement_latency: {
    day: string;
    payouts: number;
    auto_approved: number;
    rate: string;
  }[];
  flow_stream: {
    internal_transactions: { count: number; gross_formatted: string };
    gateway_payouts: { count: number; gross_formatted: string; fees_formatted: string; net_formatted: string };
    bank_credits: { count: number; credit_formatted: string };
    matched_reconciled: { count: number; percentage: number; reconciled_val: string };
    flagged_exceptions: { count: number; percentage: number; unreconciled_val: string };
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCitations {
  stages: string[];
  evidence_ledger_hash?: string | null;
  event_id?: string | null;
  residual_paise: number;
  residual_formatted: string;
  confidence: number;
  gatekeeper_status: string;
  matched_transaction_ids?: string[];
  matched_bank_ids?: string[];
}

export interface PrecomputedRecordFacts {
  run_id: string;
  record_id: string;
  gross_amount_paise: number;
  gross_amount_formatted: string;
  net_amount_paise: number;
  net_amount_formatted: string;
  processing_fee_paise: number;
  processing_fee_formatted: string;
  refund_amount_paise: number;
  chargeback_amount_paise: number;
  stage_1_sum_paise: number;
  stage_1_sum_formatted: string;
  stage_1_residual_paise: number;
  stage_1_residual_formatted: string;
  stage_1_matched_txns: string[];
  stage_2_sum_paise: number;
  stage_2_sum_formatted: string;
  stage_2_residual_paise: number;
  stage_2_residual_formatted: string;
  stage_2_matched_banks: string[];
  total_residual_paise: number;
  total_residual_formatted: string;
  confidence_score: number;
  gatekeeper_status: string;
  validator_checks: Record<string, boolean>;
  failure_reasons: string[];
  candidate_matches: Array<{
    type: string;
    id: string;
    matched: boolean;
    score: number;
    stage: string;
  }>;
  evidence_ledger_hash: string;
  evidence_prev_hash: string;
  evidence_event_id: string;
  timestamp: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  citations?: ChatCitations;
  session_id?: string;
  reward?: number | null;
  feedback_text?: string;
  source?: string;
}

export interface ChatRequest {
  run_id?: string;
  record_id: string;
  message: string;
  session_id?: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  record_id: string;
  run_id: string;
  citations: ChatCitations;
  precomputed_facts: PrecomputedRecordFacts;
  source: string;
  session_id?: string;
  message_id?: string;
  learned_corrections?: string[];
}

export interface ChatFeedbackPayload {
  record_id: string;
  message_id: string;
  reward: number;
  feedback_text?: string;
  query?: string;
  response?: string;
}

export interface ChatFeedbackResponse {
  feedback_id: string;
  message_id: string;
  reward: number;
  correction_rule?: string;
  status: string;
}

export interface ChatSessionItem {
  session_id: string;
  record_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatHistoryResponse {
  record_id: string;
  messages: ChatMessage[];
  sessions: ChatSessionItem[];
  learned_rules: string[];
}

export interface RLStatsResponse {
  total_messages: number;
  total_feedback_count: number;
  positive_rewards: number;
  negative_rewards: number;
  accuracy_rating: number;
  active_correction_rules_count: number;
  learned_correction_rules: string[];
}
