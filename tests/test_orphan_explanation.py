"""Regression test suite for PO_B01_000001 and unlinked orphan Stage 1 explainability."""
import pytest
from src.models import (
    ReconciliationResult,
    Stage1Link,
    Stage2Link,
    DecisionStatus,
    NormalizedRecord,
)
from src.agents import AuditorAgent
from src.assistant import ReconciliationAssistant, ChatRequest
from src.matcher import ReconciliationMatcher
from src.config import DEFAULT_CONFIG


def test_orphan_payout_narrative_explains_unmatched_stage1():
    """Assert that AuditorAgent generates explicit unlinked orphan explanation when Stage 1 has 0 matches."""
    auditor = AuditorAgent()

    # PO_B01_000001 orphan case: Stage 1 = 0 matched, Stage 2 = exact bank credit match
    result = ReconciliationResult(
        settlement_id="PO_B01_000001",
        decision=DecisionStatus.UNRESOLVED,
        confidence_score=0.0,
        stage1=Stage1Link(
            payout_id="PO_B01_000001",
            transaction_ids=[],
            gross_sum_minor=0,
            payout_gross_minor=412412,
            balance_residual_minor=412412,
            confidence_score=0.0,
            is_valid=False,
            failure_reasons=["NO_STAGE1_MATCH_FOUND"],
        ),
        stage2=Stage2Link(
            payout_id="PO_B01_000001",
            bank_entry_ids=["BNK_B01_000001"],
            bank_credit_sum_minor=404164,
            payout_net_minor=404164,
            balance_residual_minor=0,
            confidence_score=0.904,
            is_valid=True,
            failure_reasons=[],
        ),
        failure_reasons=["STAGE1_NO_VALID_TRANSACTIONS_MATCHED"],
    )

    explanation = auditor.generate_narrative(result)

    assert explanation.settlement_id == "PO_B01_000001"
    assert explanation.decision == DecisionStatus.UNRESOLVED

    # Summary verdict must explain the missing internal candidate transactions clearly
    verdict = explanation.summary_verdict
    assert "0 candidate internal transactions found" in verdict or "Unlinked Orphan Payout" in verdict
    assert "Stage 2 bank deposit" in verdict or "BNK_B01_000001" in verdict
    assert "missing" in verdict.lower()

    # Recommended action must guide the operator on missing internal invoices
    rec_action = explanation.recommended_action
    assert "missing internal order/invoice" in rec_action.lower() or "upload missing transaction" in rec_action.lower()


def test_assistant_deterministic_fallback_explains_orphan_record():
    """Assert that the conversational assistant explains why an orphan record has 0 Stage 1 matches."""
    assistant = ReconciliationAssistant()
    assistant.api_key = ""  # Force deterministic mode

    req = ChatRequest(
        record_id="PO_B01_000001",
        message="Why is this record unresolved? Explain what happened in Stage 1."
    )
    resp = assistant.ask(req)

    reply_lower = resp.reply.lower()
    assert "stage 1" in reply_lower
    assert "residual" in reply_lower or "paise" in reply_lower or "0 candidate" in reply_lower


def test_stage1_matcher_solves_batch_subset_when_candidates_present():
    """Assert that ReconciliationMatcher solves 2-to-1 batch consolidation when candidate txns are present."""
    payout = NormalizedRecord(
        record_id="PO_B01_000001",
        source_type="PAYOUT",
        reference_tokens=["flpk", "ord", "530290", "flpk", "ord", "417200", "batch", "0001"],
        clean_reference="FLPK-ORD-530290 FLPK-ORD-417200 BATCH-FLPK-0001",
        amount_minor=412412,
        currency="INR",
        timestamp_epoch=1785730920,
        raw_timestamp="2026-08-03T04:22:00Z",
        raw_payload={"batch_token": "BATCH-FLPK-0001", "gross_amount_minor": 412412}
    )

    txn1 = NormalizedRecord(
        record_id="TXN_B01_000001",
        source_type="TRANSACTION",
        reference_tokens=["flpk", "ord", "530290"],
        clean_reference="FLPK-ORD-530290",
        amount_minor=233416,
        currency="INR",
        timestamp_epoch=1785687720,
        raw_timestamp="2026-08-02T16:22:00Z",
        raw_payload={"customer_reference": "FLPK-ORD-530290", "gross_amount_minor": 233416}
    )

    txn2 = NormalizedRecord(
        record_id="TXN_B01_000002",
        source_type="TRANSACTION",
        reference_tokens=["flpk", "ord", "417200"],
        clean_reference="FLPK-ORD-417200",
        amount_minor=178996,
        currency="INR",
        timestamp_epoch=1785688620,
        raw_timestamp="2026-08-02T16:37:00Z",
        raw_payload={"customer_reference": "FLPK-ORD-417200", "gross_amount_minor": 178996}
    )

    matcher = ReconciliationMatcher(DEFAULT_CONFIG)
    matches = matcher.match_stage1([payout], [txn1, txn2])

    assert "PO_B01_000001" in matches
    link = matches["PO_B01_000001"]
    assert link.is_valid is True
    assert link.balance_residual_minor == 0
    assert link.gross_sum_minor == 412412
    assert set(link.transaction_ids) == {"TXN_B01_000001", "TXN_B01_000002"}
