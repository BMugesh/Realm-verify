"""Unit tests for deterministic accounting validator."""
import pytest
from src.models import (
    NormalizedRecord,
    Stage1Link,
    Stage2Link,
    DecisionStatus,
)
from src.validator import AccountingValidator


def test_validator_payout_equation_failure():
    """Verify that a malformed payout equation (gross - fee != net) is rejected to UNRESOLVED."""
    validator = AccountingValidator()

    # Payout where gross=10000, fee=500, but net=10000 (violation)
    payout = NormalizedRecord(
        record_id="PO_MALFORMED",
        source_type="PAYOUT",
        reference_tokens=["malformed"],
        clean_reference="RZP-MAL",
        amount_minor=10000,
        currency="INR",
        timestamp_epoch=1772370000,
        raw_timestamp="2026-03-01T12:00:00Z",
        raw_payload={
            "gross_amount_minor": 10000,
            "processing_fee_minor": 500,
            "refund_amount_minor": 0,
            "chargeback_amount_minor": 0,
            "net_settlement_amount_minor": 10000,
        }
    )

    s1 = Stage1Link(
        payout_id="PO_MALFORMED",
        transaction_ids=["TXN_1"],
        gross_sum_minor=10000,
        payout_gross_minor=10000,
        balance_residual_minor=0,
        confidence_score=0.95,
        is_valid=True
    )
    s2 = Stage2Link(
        payout_id="PO_MALFORMED",
        bank_entry_ids=["BNK_1"],
        bank_credit_sum_minor=10000,
        payout_net_minor=10000,
        balance_residual_minor=0,
        confidence_score=0.95,
        is_valid=True
    )

    txns = {
        "TXN_1": NormalizedRecord(
            record_id="TXN_1", source_type="TRANSACTION", reference_tokens=["malformed"],
            clean_reference="RZP-MAL", amount_minor=10000, currency="INR",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        )
    }
    banks = {
        "BNK_1": NormalizedRecord(
            record_id="BNK_1", source_type="BANK_ENTRY", reference_tokens=["malformed"],
            clean_reference="RZP-MAL", amount_minor=10000, currency="INR",
            timestamp_epoch=1772380000, raw_timestamp="2026-03-01T14:00:00Z"
        )
    }

    res, exc = validator.validate_two_stage_settlement(payout, s1, s2, txns, banks)
    assert res.decision == DecisionStatus.UNRESOLVED
    assert "PAYOUT_INTERNAL_EQUATION" in res.validator_checks
    assert res.validator_checks["PAYOUT_INTERNAL_EQUATION"] is False
    assert exc is not None
    assert exc.category == "MALFORMED_PAYOUT_EQUATION"


def test_validator_cross_currency_policy():
    """Verify that non-base currency records are safely routed to NEEDS_REVIEW."""
    validator = AccountingValidator()

    payout = NormalizedRecord(
        record_id="PO_USD_1",
        source_type="PAYOUT",
        reference_tokens=["usd", "ref"],
        clean_reference="RZP-USD",
        amount_minor=2500,  # $25.00
        currency="USD",
        timestamp_epoch=1772370000,
        raw_timestamp="2026-03-01T12:00:00Z",
        raw_payload={
            "gross_amount_minor": 2500,
            "processing_fee_minor": 0,
            "refund_amount_minor": 0,
            "chargeback_amount_minor": 0,
            "net_settlement_amount_minor": 2500,
        }
    )

    s1 = Stage1Link(
        payout_id="PO_USD_1",
        transaction_ids=["TXN_USD"],
        gross_sum_minor=2500,
        payout_gross_minor=2500,
        balance_residual_minor=0,
        confidence_score=0.95,
        is_valid=True
    )
    s2 = Stage2Link(
        payout_id="PO_USD_1",
        bank_entry_ids=["BNK_USD"],
        bank_credit_sum_minor=2500,
        payout_net_minor=2500,
        balance_residual_minor=0,
        confidence_score=0.95,
        is_valid=True
    )

    txns = {
        "TXN_USD": NormalizedRecord(
            record_id="TXN_USD", source_type="TRANSACTION", reference_tokens=["usd"],
            clean_reference="USD-REF", amount_minor=2500, currency="USD",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        )
    }
    banks = {
        "BNK_USD": NormalizedRecord(
            record_id="BNK_USD", source_type="BANK_ENTRY", reference_tokens=["usd"],
            clean_reference="WIRE/USD", amount_minor=2500, currency="USD",
            timestamp_epoch=1772380000, raw_timestamp="2026-03-01T14:00:00Z"
        )
    }

    res, exc = validator.validate_two_stage_settlement(payout, s1, s2, txns, banks)
    assert res.decision == DecisionStatus.NEEDS_REVIEW
    assert exc is not None
    assert exc.category == "CURRENCY_POLICY_UNSUPPORTED"
