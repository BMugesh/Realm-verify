"""Unit tests for synthetic dataset generation."""
import pytest
from src.generator import SyntheticDataGenerator


def test_generator_deterministic_seed():
    """Verify that generating with the same seed produces identical datasets."""
    gen1 = SyntheticDataGenerator(seed=42, target_records=50)
    t1, p1, b1, g1 = gen1.generate()

    gen2 = SyntheticDataGenerator(seed=42, target_records=50)
    t2, p2, b2, g2 = gen2.generate()

    assert len(t1) == len(t2)
    assert len(p1) == len(p2)
    assert len(b1) == len(b2)
    assert len(g1) == len(g2)

    assert [t.transaction_id for t in t1] == [t.transaction_id for t in t2]
    assert [t.gross_amount_minor for t in t1] == [t.gross_amount_minor for t in t2]
    assert [p.payout_id for p in p1] == [p.payout_id for p in p2]


def test_generator_different_seeds():
    """Verify that different seeds produce different datasets."""
    gen1 = SyntheticDataGenerator(seed=42, target_records=50)
    t1, _, _, _ = gen1.generate()

    gen2 = SyntheticDataGenerator(seed=99, target_records=50)
    t2, _, _, _ = gen2.generate()

    # Amounts and references should differ
    assert [t.gross_amount_minor for t in t1] != [t.gross_amount_minor for t in t2]


def test_generator_anomaly_distribution():
    """Verify that key anomaly categories are generated."""
    gen = SyntheticDataGenerator(seed=42, target_records=500)
    txns, payouts, bank_entries, ground_truth = gen.generate()

    categories = {g.anomaly_category for g in ground_truth}
    expected_categories = {
        "EXACT_MATCH_1TO1",
        "FEE_ADJUSTED_1TO1",
        "MANY_TO_ONE_BATCH",
        "ONE_TO_MANY_SPLIT",
        "NOISY_REFERENCE",
        "DELAYED_SETTLEMENT",
        "PARTIAL_REFUND_REVERSAL",
        "DUPLICATE_NEAR_AMOUNT",
        "AMBIGUOUS_CANDIDATE",
        "MISSING_COUNTERPART",
        "AMOUNT_MISMATCH",
        "CROSS_CURRENCY",
        "MALFORMED_RECORD",
    }

    assert len(txns) >= 500
    assert len(payouts) > 0
    assert len(bank_entries) > 0
    assert expected_categories.issubset(categories)


def test_generator_integer_minor_amounts_only():
    """Verify all monetary values in generated records are integers."""
    gen = SyntheticDataGenerator(seed=42, target_records=100)
    txns, payouts, bank_entries, _ = gen.generate()

    for t in txns:
        assert isinstance(t.gross_amount_minor, int)
        assert isinstance(t.net_amount_minor, int)
        assert t.gross_amount_minor > 0

    for p in payouts:
        assert isinstance(p.gross_amount_minor, int)
        assert isinstance(p.processing_fee_minor, int)
        assert isinstance(p.refund_amount_minor, int)
        assert isinstance(p.chargeback_amount_minor, int)
        assert isinstance(p.net_settlement_amount_minor, int)

    for b in bank_entries:
        assert isinstance(b.credit_amount_minor, int)
        assert isinstance(b.debit_amount_minor, int)
