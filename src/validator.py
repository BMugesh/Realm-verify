"""Deterministic accounting validator for Realm Verify.

Guarantees 100% integer arithmetic (paise) and zero invalid committed matches.
Never fails open.
"""
from typing import List, Dict, Set, Tuple, Optional
from src.models import (
    NormalizedRecord,
    Stage1Link,
    Stage2Link,
    DecisionStatus,
    ReconciliationResult,
    ReconciliationException,
)
from src.config import PipelineConfig, DEFAULT_CONFIG


class AccountingValidator:
    """Strict accounting constraint validator."""

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG):
        self.config = config

    def validate_two_stage_settlement(
        self,
        payout: NormalizedRecord,
        stage1_link: Optional[Stage1Link],
        stage2_link: Optional[Stage2Link],
        all_txns_by_id: Dict[str, NormalizedRecord],
        all_banks_by_id: Dict[str, NormalizedRecord],
    ) -> Tuple[ReconciliationResult, Optional[ReconciliationException]]:
        """Validate both stages of settlement against deterministic accounting rules."""
        checks: Dict[str, bool] = {}
        failure_reasons: List[str] = []
        p_payload = payout.raw_payload

        # Check 1: Payout Internal Accounting Equation
        # gross - fees - refunds - chargebacks == net_settlement
        gross = p_payload.get("gross_amount_minor", 0)
        fees = p_payload.get("processing_fee_minor", 0)
        refunds = p_payload.get("refund_amount_minor", 0)
        chargebacks = p_payload.get("chargeback_amount_minor", 0)
        net = p_payload.get("net_settlement_amount_minor", 0)

        payout_equation_valid = (gross - fees - refunds - chargebacks) == net
        checks["PAYOUT_INTERNAL_EQUATION"] = payout_equation_valid
        expected_net = gross - fees - refunds - chargebacks
        if not payout_equation_valid:
            failure_reasons.append(
                f"Payout equation failed: gross={gross:,} paise; fees={fees:,} paise; refunds={refunds:,} paise; chargebacks={chargebacks:,} paise; expected net={expected_net:,} paise; reported net={net:,} paise"
            )

        # Check 2: Stage 1 Transaction Link & Balance
        s1_valid = False
        s1_score = 0.0
        if stage1_link and stage1_link.is_valid and stage1_link.transaction_ids:
            computed_gross = sum(
                all_txns_by_id[tid].amount_minor
                for tid in stage1_link.transaction_ids
                if tid in all_txns_by_id
            )
            if computed_gross == gross:
                s1_valid = True
                s1_score = stage1_link.confidence_score
            else:
                failure_reasons.append(
                    f"STAGE1_GROSS_BALANCE_MISMATCH: sum(txns)={computed_gross} paise vs payout_gross={gross} paise"
                )
        else:
            failure_reasons.append("STAGE1_NO_VALID_TRANSACTIONS_MATCHED")
        checks["STAGE1_BALANCE"] = s1_valid

        # Check 3: Stage 2 Bank Link & Balance
        s2_valid = False
        s2_score = 0.0
        if stage2_link and stage2_link.is_valid and stage2_link.bank_entry_ids:
            computed_bank_credit = sum(
                all_banks_by_id[bid].amount_minor
                for bid in stage2_link.bank_entry_ids
                if bid in all_banks_by_id
            )
            if computed_bank_credit == net:
                s2_valid = True
                s2_score = stage2_link.confidence_score
            else:
                failure_reasons.append(
                    f"STAGE2_NET_BALANCE_MISMATCH: sum(banks)={computed_bank_credit} paise vs payout_net={net} paise"
                )
        else:
            failure_reasons.append("STAGE2_NO_VALID_BANK_ENTRIES_MATCHED")
        checks["STAGE2_BALANCE"] = s2_valid

        # Check 4: Currency Consistency Policy
        currency_valid = True
        is_cross_currency = False
        if payout.currency != self.config.base_currency:
            is_cross_currency = True

        if stage1_link and stage1_link.transaction_ids:
            for tid in stage1_link.transaction_ids:
                if tid in all_txns_by_id and all_txns_by_id[tid].currency != payout.currency:
                    currency_valid = False
                    failure_reasons.append(f"STAGE1_CURRENCY_MISMATCH: {tid} ({all_txns_by_id[tid].currency}) != payout ({payout.currency})")

        if stage2_link and stage2_link.bank_entry_ids:
            for bid in stage2_link.bank_entry_ids:
                if bid in all_banks_by_id and all_banks_by_id[bid].currency != payout.currency:
                    currency_valid = False
                    failure_reasons.append(f"STAGE2_CURRENCY_MISMATCH: {bid} ({all_banks_by_id[bid].currency}) != payout ({payout.currency})")

        checks["CURRENCY_CONSISTENCY"] = currency_valid

        # Check 5: Date Ordering Policy
        date_valid = True
        tol_seconds = self.config.tolerance_days * 86400
        if stage1_link and stage1_link.transaction_ids:
            for tid in stage1_link.transaction_ids:
                if tid in all_txns_by_id:
                    t_time = all_txns_by_id[tid].timestamp_epoch
                    if t_time > payout.timestamp_epoch + 86400:
                        date_valid = False
                        failure_reasons.append(f"DATE_ORDER_VIOLATION: txn {tid} created after payout {payout.record_id}")

        if stage2_link and stage2_link.bank_entry_ids:
            for bid in stage2_link.bank_entry_ids:
                if bid in all_banks_by_id:
                    b_time = all_banks_by_id[bid].timestamp_epoch
                    if b_time < payout.timestamp_epoch - 86400 or (b_time - payout.timestamp_epoch) > tol_seconds:
                        date_valid = False
                        failure_reasons.append(f"DATE_WINDOW_VIOLATION: bank {bid} outside tolerance window")

        checks["DATE_ORDER_VALIDITY"] = date_valid

        # Combined confidence score
        overall_confidence = (s1_score + s2_score) / 2.0 if (s1_valid and s2_valid) else 0.0

        all_hard_checks_pass = (
            payout_equation_valid and s1_valid and s2_valid and currency_valid and date_valid
        )

        exception: Optional[ReconciliationException] = None

        # Deterministic Exception Routing & Standard Operating Procedure (SOP) Action Table
        if all_hard_checks_pass:
            if is_cross_currency:
                decision = DecisionStatus.NEEDS_REVIEW
                exception = ReconciliationException(
                    exception_id=f"EXC_{payout.record_id}",
                    source_id=payout.record_id,
                    source_type="PAYOUT",
                    decision=DecisionStatus.NEEDS_REVIEW,
                    category="CURRENCY_POLICY_UNSUPPORTED",
                    reason=f"Cross-currency transaction detected ({payout.currency}). Foreign exchange table review required.",
                    candidate_ids=(stage1_link.transaction_ids if stage1_link else []) + (stage2_link.bank_entry_ids if stage2_link else []),
                    amount_minor=gross,
                    currency=payout.currency,
                    recommended_action="Route to FX desk for FX conversion rate verification and manual settlement approval."
                )
            elif overall_confidence >= self.config.min_confidence_threshold:
                decision = DecisionStatus.AUTO_APPROVED
            else:
                decision = DecisionStatus.NEEDS_REVIEW
                exception = ReconciliationException(
                    exception_id=f"EXC_{payout.record_id}",
                    source_id=payout.record_id,
                    source_type="PAYOUT",
                    decision=DecisionStatus.NEEDS_REVIEW,
                    category="LOW_CONFIDENCE_AMBIGUITY",
                    reason=f"Candidate passed balance checks but reference confidence ({overall_confidence:.2f}) is below auto-approval threshold ({self.config.min_confidence_threshold}).",
                    candidate_ids=(stage1_link.transaction_ids if stage1_link else []) + (stage2_link.bank_entry_ids if stage2_link else []),
                    amount_minor=gross,
                    currency=payout.currency,
                    recommended_action="Perform secondary reference verification and verify narration tokens before approval."
                )
        else:
            decision = DecisionStatus.UNRESOLVED
            if not payout_equation_valid:
                cat = "MALFORMED_PAYOUT_EQUATION"
                rec_action = "Reject payout batch; alert gateway operations team of internal balance equation failure."
            elif not s1_valid and not s2_valid:
                cat = "ORPHAN_PAYOUT"
                rec_action = "Investigate missing upstream internal transaction and downstream bank statement credit."
            elif not s1_valid:
                cat = "MISSING_INTERNAL_TRANSACTION"
                rec_action = "Trace customer order ID in core order service; check if payment was captured under alternate gateway account."
            elif not s2_valid:
                cat = "MISSING_BANK_CREDIT"
                rec_action = "Query nodal bank intraday statement or file bank inquiry for unsettled NEFT/RTGS payout."
            elif not date_valid:
                cat = "DATE_WINDOW_EXCEEDED"
                rec_action = "Review delayed settlement batch with bank relationship manager."
            else:
                cat = "BALANCE_MISMATCH"
                rec_action = "Verify potential undisclosed gateway deductions, chargeback adjustments, or fee revisions."

            exception = ReconciliationException(
                exception_id=f"EXC_{payout.record_id}",
                source_id=payout.record_id,
                source_type="PAYOUT",
                decision=DecisionStatus.UNRESOLVED,
                category=cat,
                reason="; ".join(failure_reasons),
                candidate_ids=[],
                amount_minor=gross,
                currency=payout.currency,
                recommended_action=rec_action
            )

        result = ReconciliationResult(
            settlement_id=payout.record_id,
            decision=decision,
            stage1=stage1_link,
            stage2=stage2_link,
            confidence_score=overall_confidence,
            validator_checks=checks,
            failure_reasons=failure_reasons,
            is_fully_reconciled=(decision == DecisionStatus.AUTO_APPROVED)
        )

        return result, exception
