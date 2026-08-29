"""Exact-match baseline reconciliation for Realm Verify.

Acts as the comparison floor: simple exact reference and exact amount matching,
with zero fuzzy logic, zero batch combination search, and zero LLM assistance.
"""
from typing import List, Dict, Tuple, Optional
from src.models import (
    NormalizedRecord,
    Stage1Link,
    Stage2Link,
    DecisionStatus,
    ReconciliationResult,
    ReconciliationException,
)


class ExactMatchBaseline:
    """Simple exact reference-ID and amount matcher."""

    def reconcile(
        self,
        txns: List[NormalizedRecord],
        payouts: List[NormalizedRecord],
        banks: List[NormalizedRecord],
    ) -> Tuple[List[ReconciliationResult], List[ReconciliationException]]:
        """Run exact-match baseline reconciliation."""
        results: List[ReconciliationResult] = []
        exceptions: List[ReconciliationException] = []

        # Index transactions by (clean_reference, amount_minor)
        txns_by_ref_amt: Dict[Tuple[str, int], List[NormalizedRecord]] = {}
        for t in txns:
            key = (t.clean_reference, t.amount_minor)
            txns_by_ref_amt.setdefault(key, []).append(t)

        # Index bank entries by exact amount
        banks_by_amt: Dict[int, List[NormalizedRecord]] = {}
        for b in banks:
            banks_by_amt.setdefault(b.amount_minor, []).append(b)

        assigned_txns = set()
        assigned_banks = set()

        for p in payouts:
            gross = p.amount_minor
            net = p.raw_payload.get("net_settlement_amount_minor", gross)
            p_ref = p.clean_reference

            # Stage 1: Exact reference match on reference token or exact substring
            s1_matched_txn = None
            for t in txns:
                if t.record_id in assigned_txns:
                    continue
                # Check if exact token or amount match
                if (t.clean_reference == p_ref or any(tok in p.reference_tokens for tok in t.reference_tokens)) and t.amount_minor == gross:
                    s1_matched_txn = t
                    assigned_txns.add(t.record_id)
                    break

            # Stage 2: Exact net amount and reference in bank narration
            s2_matched_bank = None
            for b in banks:
                if b.record_id in assigned_banks:
                    continue
                if b.amount_minor == net and (p_ref in b.clean_reference or any(tok in b.reference_tokens for tok in p.reference_tokens)):
                    s2_matched_bank = b
                    assigned_banks.add(b.record_id)
                    break

            # Create Stage Links
            s1_link = None
            if s1_matched_txn:
                s1_link = Stage1Link(
                    payout_id=p.record_id,
                    transaction_ids=[s1_matched_txn.record_id],
                    gross_sum_minor=s1_matched_txn.amount_minor,
                    payout_gross_minor=gross,
                    balance_residual_minor=abs(s1_matched_txn.amount_minor - gross),
                    confidence_score=1.0,
                    is_valid=True
                )

            s2_link = None
            if s2_matched_bank:
                s2_link = Stage2Link(
                    payout_id=p.record_id,
                    bank_entry_ids=[s2_matched_bank.record_id],
                    bank_credit_sum_minor=s2_matched_bank.amount_minor,
                    payout_net_minor=net,
                    balance_residual_minor=abs(s2_matched_bank.amount_minor - net),
                    confidence_score=1.0,
                    is_valid=True
                )

            # Baseline decision
            if s1_link and s2_link and s1_link.is_valid and s2_link.is_valid:
                decision = DecisionStatus.AUTO_APPROVED
                is_reconciled = True
            else:
                decision = DecisionStatus.UNRESOLVED
                is_reconciled = False
                exceptions.append(ReconciliationException(
                    exception_id=f"EXC_BASE_{p.record_id}",
                    source_id=p.record_id,
                    source_type="PAYOUT",
                    decision=DecisionStatus.UNRESOLVED,
                    category="BASELINE_UNMATCHED",
                    reason="Exact reference/amount match not found in one or both stages",
                    amount_minor=gross,
                    currency=p.currency,
                    recommended_action="Route to advanced reconciliation engine or manual review"
                ))

            results.append(ReconciliationResult(
                settlement_id=p.record_id,
                decision=decision,
                stage1=s1_link,
                stage2=s2_link,
                confidence_score=1.0 if is_reconciled else 0.0,
                validator_checks={
                    "STAGE1_MATCH": s1_link is not None,
                    "STAGE2_MATCH": s2_link is not None
                },
                is_fully_reconciled=is_reconciled
            ))

        return results, exceptions
