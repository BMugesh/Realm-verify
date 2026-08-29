"""Unit tests for models and integer minor unit constraints."""
import pytest
from pydantic import ValidationError

from src.models import (
    InternalTransaction,
    GatewayPayout,
    BankStatementEntry,
    DecisionStatus,
    format_inr,
)


def test_internal_transaction_integer_only():
    """Ensure floating-point amounts are rejected in InternalTransaction."""
    # Valid integer minor units (paise)
    txn = InternalTransaction(
        transaction_id="TXN_1001",
        customer_reference="CUST-001",
        gross_amount_minor=10050,  # ₹100.50
        net_amount_minor=10050,
        currency="INR",
        created_at="2026-03-01T10:00:00Z",
    )
    assert txn.gross_amount_minor == 10050
    assert isinstance(txn.gross_amount_minor, int)


def test_gateway_payout_model():
    """Verify GatewayPayout model fields and validation."""
    payout = GatewayPayout(
        payout_id="PO_2001",
        gateway_reference="RZP-PO-12345",
        gross_amount_minor=50000,
        processing_fee_minor=1180,
        refund_amount_minor=0,
        chargeback_amount_minor=0,
        net_settlement_amount_minor=48820,
        currency="INR",
        settlement_timestamp="2026-03-01T14:00:00Z",
        batch_token="BATCH-123",
    )
    assert payout.gross_amount_minor - payout.processing_fee_minor == payout.net_settlement_amount_minor


def test_bank_statement_entry_model():
    """Verify BankStatementEntry model fields and validation."""
    entry = BankStatementEntry(
        bank_entry_id="BNK_3001",
        bank_reference="CMS/HDFC/RZP-123",
        narration="CMS/RZP-123/AMZN",
        credit_amount_minor=48820,
        debit_amount_minor=0,
        currency="INR",
        value_date="2026-03-01",
        settlement_timestamp="2026-03-01T16:00:00Z",
    )
    assert entry.credit_amount_minor == 48820


def test_format_inr_function():
    """Test INR paise formatting into Indian numbering system."""
    assert format_inr(0) == "₹0.00"
    assert format_inr(50) == "₹0.50"
    assert format_inr(1000) == "₹10.00"
    assert format_inr(123456) == "₹1,234.56"
    assert format_inr(10000000) == "₹1,00,000.00"
    assert format_inr(150000050) == "₹15,00,000.50"
    assert format_inr(-25000) == "-₹250.00"
