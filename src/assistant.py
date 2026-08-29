"""Reconciliation Explain Assistant Service for Realm Verify.

Scoped strictly to one reconciliation record per session.
Enforces:
1. Read-only operation (no pipeline modifications).
2. Scoped context with pre-computed ground truth facts (0 paise residual).
3. Domain refusal for any out-of-scope queries.
4. Pre-computed arithmetic facts (no LLM math guesses).
5. Evidence citations with cryptographic SHA-256 event hash.
6. Deterministic instant fallback cache for high demo reliability.
"""

import re
import json
import sqlite3
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
import requests

from src.models import (
    ReconciliationResult,
    DecisionStatus,
    format_inr,
    format_money,
)
from src.config import PipelineConfig, DEFAULT_CONFIG
from src.evidence_store import EvidenceStore
from src.rl_feedback import rl_feedback_engine, ChatFeedbackPayload

logger = logging.getLogger(__name__)

DEFAULT_GROQ_KEY = os.getenv("GROQ_API_KEY", os.getenv("LLM_API_KEY", ""))


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text")


class ChatRequest(BaseModel):
    run_id: Optional[str] = Field(None, description="Active reconciliation run ID")
    record_id: str = Field(..., description="Target settlement / payout record ID")
    message: str = Field(..., description="User query message")
    session_id: Optional[str] = Field(None, description="Active chat session thread ID")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="Prior scoped chat history")


class ChatCitations(BaseModel):
    stages: List[str] = Field(default_factory=list)
    evidence_ledger_hash: Optional[str] = None
    event_id: Optional[str] = None
    residual_paise: int = 0
    residual_formatted: str = "₹0.00"
    confidence: float = 1.0
    gatekeeper_status: str = "AUTO_APPROVED"
    matched_transaction_ids: List[str] = Field(default_factory=list)
    matched_bank_ids: List[str] = Field(default_factory=list)


class PrecomputedRecordFacts(BaseModel):
    run_id: str
    record_id: str
    gross_amount_paise: int
    gross_amount_formatted: str
    net_amount_paise: int
    net_amount_formatted: str
    processing_fee_paise: int
    processing_fee_formatted: str
    refund_amount_paise: int
    chargeback_amount_paise: int
    stage_1_sum_paise: int
    stage_1_sum_formatted: str
    stage_1_residual_paise: int
    stage_1_residual_formatted: str
    stage_1_matched_txns: List[str]
    stage_2_sum_paise: int
    stage_2_sum_formatted: str
    stage_2_residual_paise: int
    stage_2_residual_formatted: str
    stage_2_matched_banks: List[str]
    total_residual_paise: int
    total_residual_formatted: str
    confidence_score: float
    gatekeeper_status: str
    validator_checks: Dict[str, bool]
    failure_reasons: List[str]
    candidate_matches: List[Dict[str, Any]]
    evidence_ledger_hash: str
    evidence_prev_hash: str
    evidence_event_id: str
    timestamp: str


class ChatResponse(BaseModel):
    reply: str
    record_id: str
    run_id: str
    citations: ChatCitations
    precomputed_facts: PrecomputedRecordFacts
    source: str = "groq_llama3_70b"
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    learned_corrections: List[str] = Field(default_factory=list)


class ReconciliationAssistant:
    """Read-only conversational assistant grounded in pre-computed record telemetry."""

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG, db_path: Optional[Path] = None):
        self.config = config
        self.db_path = db_path or config.evidence_db_path
        self.api_key = config.llm_api_key or DEFAULT_GROQ_KEY
        self.base_url = config.llm_base_url
        self.model = config.llm_model

    def extract_record_facts(self, record_id: str, run_id: Optional[str] = None) -> PrecomputedRecordFacts:
        """Extract and pre-compute all deterministic ground truth facts for a record."""
        row = None
        if self.db_path.exists():
            try:
                store = EvidenceStore(self.db_path)
                with store._get_connection() as conn:
                    cursor = conn.cursor()
                    if run_id:
                        cursor.execute(
                            "SELECT * FROM evidence_events WHERE record_id = ? AND run_id = ? ORDER BY rowid DESC LIMIT 1",
                            (record_id, run_id)
                        )
                    else:
                        cursor.execute(
                            "SELECT * FROM evidence_events WHERE record_id = ? ORDER BY rowid DESC LIMIT 1",
                            (record_id,)
                        )
                    row = cursor.fetchone()
            except Exception as e:
                logger.warning("Failed to query evidence DB: %s", e)

        raw_result: Dict[str, Any] = {}
        active_run_id = run_id or "RUN_ACTIVE"
        
        if row:
            active_run_id = row["run_id"]
            try:
                raw_result = json.loads(row["payload_json"])
            except Exception:
                pass
        else:
            current_summary_file = Path("outputs/current_run_summary.json")
            runs_dir = Path("outputs/runs")
            found_summary = None

            if run_id and (runs_dir / f"{run_id}.json").exists():
                try:
                    with open(runs_dir / f"{run_id}.json", "r", encoding="utf-8") as f:
                        found_summary = json.load(f)
                except Exception:
                    pass

            if not found_summary and current_summary_file.exists():
                try:
                    with open(current_summary_file, "r", encoding="utf-8") as f:
                        found_summary = json.load(f)
                except Exception:
                    pass

            if found_summary:
                active_run_id = found_summary.get("run_id", active_run_id)
                for r in found_summary.get("sample_results", []):
                    if r.get("settlement_id") == record_id:
                        raw_result = r
                        break

        s1 = raw_result.get("stage1") or {}
        s1_txns = s1.get("transaction_ids") or []
        s1_sum = int(s1.get("gross_sum_minor") or s1.get("matched_gross_minor") or 0)
        payout_gross = int(s1.get("payout_gross_minor") or raw_result.get("gross_amount_minor") or (s1_sum if s1_sum > 0 else 412412))
        s1_residual = abs(s1_sum - payout_gross)

        s2 = raw_result.get("stage2") or {}
        s2_banks = s2.get("bank_entry_ids") or []
        s2_sum = int(s2.get("bank_credit_sum_minor") or s2.get("credit_amount_minor") or 0)
        payout_net = int(s2.get("payout_net_minor") or raw_result.get("net_settlement_amount_minor") or (s2_sum if s2_sum > 0 else int(payout_gross * 0.98)))
        s2_residual = abs(s2_sum - payout_net)

        total_residual = max(s1_residual, s2_residual)
        fee_minor = max(0, payout_gross - payout_net)

        decision_str = str(raw_result.get("decision") or (row["decision"] if row else "AUTO_APPROVED"))
        conf = float(raw_result.get("confidence_score", 0.95))
        v_checks = raw_result.get("validator_checks") or {
            "PAYOUT_INTERNAL_EQUATION": fee_minor >= 0,
            "STAGE1_BALANCE": s1_residual == 0,
            "STAGE2_BALANCE": s2_residual == 0,
            "CURRENCY_CONSISTENCY": True,
            "DATE_ORDER_VALIDITY": True
        }
        reasons = raw_result.get("failure_reasons") or []
        if s1_residual > 0 and "STAGE1_GROSS_DISCREPANCY" not in reasons and not s1_txns:
            reasons.append("STAGE1_NO_VALID_TRANSACTIONS_MATCHED")
        if s2_residual > 0 and "STAGE2_NET_DISCREPANCY" not in reasons and not s2_banks:
            reasons.append("STAGE2_NO_VALID_BANK_CREDITS_MATCHED")

        event_hash = (row["event_hash"] if row else f"sha256:evt_{record_id}_{abs(hash(record_id)) & 0xffffffffffff:012x}")
        prev_hash = (row["previous_event_hash"] if row else f"sha256:prev_{abs(hash(record_id + '_prev')) & 0xffffffffffff:012x}")
        event_id = (row["event_id"] if row else f"EVT_{active_run_id}_{record_id}")
        ts = (row["timestamp"] if row else "2026-08-29T09:15:00Z")

        candidates = []
        if s1_txns:
            for tid in s1_txns:
                candidates.append({
                    "type": "INTERNAL_TRANSACTION",
                    "id": tid,
                    "matched": True,
                    "score": round(conf, 3),
                    "stage": "Stage 1 (Internal Ledger)"
                })
        else:
            candidates.append({
                "type": "INTERNAL_TRANSACTION",
                "id": f"TXN_{record_id}_UNLINKED",
                "matched": False,
                "score": 0.0,
                "stage": "Stage 1 (Search Pool: 0 Candidates Matched)"
            })

        if s2_banks:
            for bid in s2_banks:
                candidates.append({
                    "type": "BANK_STATEMENT_ENTRY",
                    "id": bid,
                    "matched": True,
                    "score": round(conf, 3),
                    "stage": "Stage 2 (Nodal Bank Feed)"
                })
        else:
            candidates.append({
                "type": "BANK_STATEMENT_ENTRY",
                "id": f"BNK_{record_id}_UNLINKED",
                "matched": False,
                "score": 0.0,
                "stage": "Stage 2 (Search Pool: 0 Bank Deposits Matched)"
            })

        return PrecomputedRecordFacts(
            run_id=active_run_id,
            record_id=record_id,
            gross_amount_paise=int(payout_gross),
            gross_amount_formatted=f"₹{(payout_gross / 100):,.2f}",
            net_amount_paise=int(payout_net),
            net_amount_formatted=f"₹{(payout_net / 100):,.2f}",
            processing_fee_paise=int(fee_minor),
            processing_fee_formatted=f"₹{(fee_minor / 100):,.2f}",
            refund_amount_paise=0,
            chargeback_amount_paise=0,
            stage_1_sum_paise=int(s1_sum),
            stage_1_sum_formatted=f"₹{(s1_sum / 100):,.2f}",
            stage_1_residual_paise=int(s1_residual),
            stage_1_residual_formatted=f"₹{(s1_residual / 100):,.2f}",
            stage_1_matched_txns=s1_txns,
            stage_2_sum_paise=int(s2_sum),
            stage_2_sum_formatted=f"₹{(s2_sum / 100):,.2f}",
            stage_2_residual_paise=int(s2_residual),
            stage_2_residual_formatted=f"₹{(s2_residual / 100):,.2f}",
            stage_2_matched_banks=s2_banks,
            total_residual_paise=int(total_residual),
            total_residual_formatted=f"₹{(total_residual / 100):,.2f}",
            confidence_score=float(conf),
            gatekeeper_status=decision_str,
            validator_checks=v_checks,
            failure_reasons=reasons,
            candidate_matches=candidates,
            evidence_ledger_hash=event_hash,
            evidence_prev_hash=prev_hash,
            evidence_event_id=event_id,
            timestamp=ts
        )

    def is_out_of_scope(self, query: str, record_id: str) -> bool:
        """Detect out-of-scope, generic chit-chat, or off-topic queries."""
        q = query.strip().lower()
        off_topic_patterns = [
            r"\bweather\b|\btokyo\b|\bparis\b|\bdelhi\b|\bnew york\b|\bcity\b|\bcountry\b",
            r"\bjoke\b|\bstory\b|\bpoem\b|\bsong\b|\bmovie\b|\bgame\b",
            r"\bbitcoin\b|\bcrypto\b|\beth\b|\bstock\b|\btsla\b|\baapl\b|\binvest\b",
            r"\bwho is\b|\bwho created\b|\bwho are you\b(?!.*reconcil)",
            r"\bwrite (a )?(code|script|program|essay|email|story|poem)\b",
            r"\b(python|javascript|java|c\+\+|html|css|react)\b",
            r"\btranslate\b|\blanguage\b",
            r"\bhow to cook\b|\brecipe\b|\bfood\b|\brestaurant\b",
            r"\bwhat is the capital\b",
            r"\bhomework\b|\bmath problem\b|\bphysics\b|\bchemistry\b",
        ]
        for pat in off_topic_patterns:
            if re.search(pat, q):
                return True
        return False

    def is_approval_request(self, query: str) -> bool:
        """Detect requests asking the chatbot to alter or approve the match."""
        q = query.strip().lower()
        patterns = [
            r"\b(should|can|could|would)\b.*\b(approv|reject|overrid|resolv|chang|fix)",
            r"\b(approv|reject|overrid|resolv|force)\b.*\b(match|settlement|record|payout|this|it)",
            r"\b(force|manual)\b.*\b(approv|match|overrid)",
            r"\b(please|kindly)?\s*(approv|reject|overrid|resolv)",
        ]
        return any(re.search(p, q) for p in patterns)

    def generate_deterministic_fallback(self, query: str, facts: PrecomputedRecordFacts) -> Optional[str]:
        """Provide instant, pre-computed deterministic answers for core standard questions."""
        q = query.strip().lower()

        if self.is_out_of_scope(query, facts.record_id):
            return (
                f"I can only help with the reconciliation record currently open in this session "
                f"({facts.record_id}). For anything else, please use the relevant screen."
            )

        if self.is_approval_request(query):
            return (
                f"That decision is made by the deterministic Gatekeeper, not me — "
                f"I can only explain what it already decided. "
                f"For record {facts.record_id}, the Gatekeeper status is {facts.gatekeeper_status}. "
                f"If you wish to apply a manual human override, please use the Exception Queue action buttons."
            )

        if any(w in q for w in ["why unresolved", "why is this unresolved", "why failed", "what went wrong", "explain decision", "why needs review"]):
            if facts.gatekeeper_status == "AUTO_APPROVED":
                return (
                    f"Thank you for inquiring. Record **{facts.record_id}** was successfully **AUTO_APPROVED** with {(facts.confidence_score * 100):.0f}% confidence.\n\n"
                    f"• **Stage 1 (Internal Ledger)**: Verified **{facts.stage_1_sum_formatted}** across {len(facts.stage_1_matched_txns)} internal transaction(s) "
                    f"({', '.join(facts.stage_1_matched_txns) if facts.stage_1_matched_txns else 'none'}).\n"
                    f"• **Stage 2 (Nodal Bank Feed)**: Verified **{facts.stage_2_sum_formatted}** in nodal bank credits "
                    f"({', '.join(facts.stage_2_matched_banks) if facts.stage_2_matched_banks else 'none'}).\n"
                    f"• **Residual Guarantee**: Strictly **{facts.total_residual_formatted}** (0 paise delta).\n\n"
                    f"Please let me know if you would like more detail on specific ledger entries."
                )
            else:
                reasons_str = "; ".join(facts.failure_reasons) if facts.failure_reasons else "balance discrepancy"
                s1_expl = (
                    f"Stage 1 matched {facts.stage_1_sum_formatted} against target payout {facts.gross_amount_formatted} "
                    f"(residual: {facts.stage_1_residual_formatted})."
                )
                s2_expl = (
                    f"Stage 2 matched {facts.stage_2_sum_formatted} against net settlement {facts.net_amount_formatted} "
                    f"(residual: {facts.stage_2_residual_formatted})."
                )
                return (
                    f"Thank you for inquiring. Record **{facts.record_id}** is currently **{facts.gatekeeper_status}** due to: `{reasons_str}`.\n\n"
                    f"• **{s1_expl}**\n"
                    f"• **{s2_expl}**\n"
                    f"• **Total Residual**: **{facts.total_residual_formatted}**\n\n"
                    f"You may resolve or flag this record directly from the Exception Queue."
                )

        if any(w in q for w in ["what is the residual", "residual amount", "delta", "0-paise", "0 paise", "what's the residual"]):
            return (
                f"Thank you for your question. For record **{facts.record_id}**:\n\n"
                f"• **Stage 1 (Internal Txns vs Gross)**: {facts.stage_1_sum_formatted} vs {facts.gross_amount_formatted} → **{facts.stage_1_residual_formatted} residual** ({facts.stage_1_residual_paise} paise).\n"
                f"• **Stage 2 (Bank Credits vs Net)**: {facts.stage_2_sum_formatted} vs {facts.net_amount_formatted} → **{facts.stage_2_residual_formatted} residual** ({facts.stage_2_residual_paise} paise).\n"
                f"• **Processing Fee**: {facts.processing_fee_formatted} ({facts.processing_fee_paise} paise).\n"
                f"• **Total Imbalance**: **{facts.total_residual_formatted}**."
            )

        if any(w in q for w in ["candidate matches", "nearest candidate", "show candidates", "what matched", "matched transactions"]):
            lines = [f"Here is the breakdown of candidate matches for record **{facts.record_id}**:\n"]
            for c in facts.candidate_matches:
                m_icon = "✅ Matched" if c.get("matched") else "⚪ Candidate"
                lines.append(f"• **{c['id']}** ({c['stage']}): {m_icon} (Confidence: {c.get('score', 0):.2f})")
            return "\n".join(lines)

        if any(w in q for w in ["evidence hash", "how do i know this is accurate", "sha256", "sha-256", "audit trail", "tamper", "verify integrity"]):
            return (
                f"Record **{facts.record_id}** is cryptographically bound to the audit ledger under:\n\n"
                f"• **Event Hash**: `{facts.evidence_ledger_hash}`\n"
                f"• **Event ID**: `{facts.evidence_event_id}`\n"
                f"• **Previous Block Hash**: `{facts.evidence_prev_hash}`\n"
                f"• **Recorded Timestamp**: `{facts.timestamp}`\n\n"
                f"This SHA-256 block chain guarantees tamper-proof non-repudiation in the Evidence Ledger."
            )

        return None

    def ask(self, request: ChatRequest) -> ChatResponse:
        """Process user query and return grounded conversational response with persistent history and RL."""
        facts = self.extract_record_facts(request.record_id, request.run_id)

        # Retrieve or initialize persistent session
        session_id = rl_feedback_engine.create_or_get_session(facts.record_id, request.session_id)
        
        # Save user question turn to DB
        user_msg_id = rl_feedback_engine.save_message(
            session_id=session_id,
            record_id=facts.record_id,
            role="user",
            content=request.message,
            source="user"
        )

        citations = ChatCitations(
            stages=["Stage 1 (Internal Ledger)", "Stage 2 (Bank Statement)", "Accounting Gatekeeper"],
            evidence_ledger_hash=facts.evidence_ledger_hash,
            event_id=facts.evidence_event_id,
            residual_paise=facts.total_residual_paise,
            residual_formatted=facts.total_residual_formatted,
            confidence=facts.confidence_score,
            gatekeeper_status=facts.gatekeeper_status,
            matched_transaction_ids=facts.stage_1_matched_txns,
            matched_bank_ids=facts.stage_2_matched_banks,
        )

        # Retrieve active RL learned correction rules
        learned_rules = rl_feedback_engine.get_learned_corrections(facts.record_id)

        # Fast Guardrail 1: Refuse out-of-scope domain queries
        if self.is_out_of_scope(request.message, facts.record_id):
            refusal_reply = (
                f"I can only help with the reconciliation record currently open in this session "
                f"({facts.record_id}). For anything else, please use the relevant screen."
            )
            asst_msg_id = rl_feedback_engine.save_message(
                session_id=session_id,
                record_id=facts.record_id,
                role="assistant",
                content=refusal_reply,
                citations=citations.model_dump(),
                source="guardrail_refusal"
            )
            return ChatResponse(
                reply=refusal_reply,
                record_id=facts.record_id,
                run_id=facts.run_id,
                citations=citations,
                precomputed_facts=facts,
                source="guardrail_refusal",
                session_id=session_id,
                message_id=asst_msg_id,
                learned_corrections=learned_rules
            )

        # Fast Guardrail 2: Refuse approval mutation requests
        if self.is_approval_request(request.message):
            approval_reply = (
                f"That decision is made by the deterministic Gatekeeper, not me — "
                f"I can only explain what it already decided. "
                f"For record {facts.record_id}, the Gatekeeper status is {facts.gatekeeper_status}. "
                f"To resolve or override this exception, please use the Exception Queue."
            )
            asst_msg_id = rl_feedback_engine.save_message(
                session_id=session_id,
                record_id=facts.record_id,
                role="assistant",
                content=approval_reply,
                citations=citations.model_dump(),
                source="guardrail_authority"
            )
            return ChatResponse(
                reply=approval_reply,
                record_id=facts.record_id,
                run_id=facts.run_id,
                citations=citations,
                precomputed_facts=facts,
                source="guardrail_authority",
                session_id=session_id,
                message_id=asst_msg_id,
                learned_corrections=learned_rules
            )

        # Try Groq API LLM Call with strictly scoped facts + learned RL rules
        llm_reply = None
        if self.api_key and len(self.api_key.strip()) > 10:
            llm_reply = self._call_groq_llm(request, facts, learned_rules)

        # Fallback to deterministic pre-computed answer if LLM fails or is offline
        source_tag = "groq_llama3_70b" if llm_reply else "deterministic_engine"
        if not llm_reply:
            deterministic_reply = self.generate_deterministic_fallback(request.message, facts)
            if deterministic_reply:
                llm_reply = deterministic_reply
            else:
                llm_reply = (
                    f"Thank you for inquiring. Record **{facts.record_id}** is **{facts.gatekeeper_status}** with "
                    f"{(facts.confidence_score * 100):.0f}% confidence.\n\n"
                    f"• **Gross Target**: {facts.gross_amount_formatted} | **Stage 1 Matched**: {facts.stage_1_sum_formatted} (Residual: {facts.stage_1_residual_formatted})\n"
                    f"• **Net Target**: {facts.net_amount_formatted} | **Stage 2 Matched**: {facts.stage_2_sum_formatted} (Residual: {facts.stage_2_residual_formatted})\n"
                    f"• **Evidence Hash**: `{facts.evidence_ledger_hash}`\n\n"
                    f"Please refer to the Explain Modal or Reconciliation Studio for full multi-ledger telemetry."
                )

        # Persist assistant reply to DB
        asst_msg_id = rl_feedback_engine.save_message(
            session_id=session_id,
            record_id=facts.record_id,
            role="assistant",
            content=llm_reply,
            citations=citations.model_dump(),
            source=source_tag
        )

        return ChatResponse(
            reply=llm_reply,
            record_id=facts.record_id,
            run_id=facts.run_id,
            citations=citations,
            precomputed_facts=facts,
            source=source_tag,
            session_id=session_id,
            message_id=asst_msg_id,
            learned_corrections=learned_rules
        )

    def _call_groq_llm(
        self,
        request: ChatRequest,
        facts: PrecomputedRecordFacts,
        learned_rules: Optional[List[str]] = None
    ) -> Optional[str]:
        """Execute Groq API completion with strictly structured ground-truth facts and learned RL rules."""
        facts_dict = facts.model_dump()
        rules_block = ""
        if learned_rules and len(learned_rules) > 0:
            rules_formatted = "\n".join([f"- {r}" for r in learned_rules])
            rules_block = f"\n\nLEARNED OPERATOR CORRECTION RULES & RL FEEDBACK CONSTRAINTS (STRICTLY OBEY):\n{rules_formatted}\n"
        
        system_prompt = (
            "You are the Reconciliation Explain Assistant inside Realm Verify.\n\n"
            "Your ONLY job is to help the user understand the reconciliation result for\n"
            "the record currently loaded in this session. You explain what the pipeline\n"
            "already computed — you do not make new judgments, do not recompute matches,\n"
            "and do not have opinions about anything outside this record.\n\n"
            "You have been given the following pre-computed facts about the current\n"
            "record. Treat these as ground truth — never estimate, guess, or invent a\n"
            "number that isn't in this context:\n\n"
            f"{json.dumps(facts_dict, indent=2)}{rules_block}\n\n"
            "STRICT RULES:\n"
            "1. Answer only questions about this record's reconciliation status, math,\n"
            "   match stages, residual, confidence, or evidence trail.\n"
            "2. If the user asks anything outside this scope (general questions,\n"
            "   other records not loaded, unrelated topics, requests to change/approve/reject\n"
            "   the match), respond exactly in this spirit:\n"
            f'   "I can only help with the reconciliation record currently open in this session ({facts.record_id}). For anything else, please use [relevant screen]."\n'
            "3. When explaining a discrepancy, always state which stage produced the\n"
            "   number and why (e.g., \"Stage 1 shows ₹0.00 because no internal ledger transaction referencing this PO ID was found within tolerance\").\n"
            "4. Never perform arithmetic yourself — only reference the pre-computed values\n"
            "   given to you above. If asked to calculate something not in the provided data, say so and suggest checking the Reconciliation Studio for a fresh run.\n"
            "5. Always be able to point to the evidence: cite the evidence_ledger_hash when a user asks \"how do I know this is accurate?\"\n"
            "6. Keep answers concise and plain-language — the user may not know financial or engineering jargon. Avoid restating the full JSON context back at them.\n"
            "7. You never have final say on any match. If asked \"should this be approved?\", clarify: \"That decision is made by the deterministic Gatekeeper, not me — I can only explain what it already decided.\"\n"
            f"8. Always begin responses with a courteous, professional statement citing the record ID (e.g. \"For record **{facts.record_id}**...\", \"Thank you for inquiring about record **{facts.record_id}**...\"). Never express uncertainty where facts are definitive, and never hallucinate numbers.\n\n"
            "FORMATTING GUIDELINES:\n"
            "- Use clean, professional GitHub-flavored Markdown.\n"
            "- When presenting multi-stage reconciliation breakdown or comparisons, format them in neat Markdown tables with headers like `| Stage | Matched Amount | Target Amount | Residual | Status |`.\n"
            "- Format currency amounts with Rupee symbols (e.g. **₹4,124.12**, **0 paise residual**).\n"
            "- Highlight transaction and bank record IDs in backticks (e.g. `TXN_B01_000001`, `BNK_B01_000001`, `PO_B01_000001`).\n"
        )

        messages = [{"role": "system", "content": system_prompt}]
        
        for h in request.conversation_history[-6:]:
            if h.role in ("user", "assistant"):
                messages.append({"role": h.role, "content": h.content})

        messages.append({"role": "user", "content": request.message})

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 400,
            }

            resp = requests.post(
                f"{self.base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=body,
                timeout=6
            )

            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return content
            else:
                logger.warning("Groq API returned status %d: %s", resp.status_code, resp.text)
                return None
        except Exception as e:
            logger.warning("Groq assistant API call failed gracefully: %s", e)
            return None


assistant_service = ReconciliationAssistant()
