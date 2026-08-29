"""Unit tests for matching algorithms (bipartite assignment and subset-sum)."""
import pytest
from src.models import NormalizedRecord
from src.matcher import ReconciliationMatcher
from src.config import PipelineConfig


def test_bipartite_matching_one_to_one():
    """Verify bipartite matching correctly matches 1:1 clean records."""
    matcher = ReconciliationMatcher()

    txns = [
        NormalizedRecord(
            record_id="TXN_1", source_type="TRANSACTION", reference_tokens=["amzn", "12345"],
            clean_reference="AMZN-INV-12345", amount_minor=50000, currency="INR",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        ),
        NormalizedRecord(
            record_id="TXN_2", source_type="TRANSACTION", reference_tokens=["flip", "99887"],
            clean_reference="FLIP-INV-99887", amount_minor=30000, currency="INR",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        )
    ]

    payouts = [
        NormalizedRecord(
            record_id="PO_1", source_type="PAYOUT", reference_tokens=["rzp", "po", "12345"],
            clean_reference="RZP-PO-12345", amount_minor=50000, currency="INR",
            timestamp_epoch=1772370000, raw_timestamp="2026-03-01T12:00:00Z",
            raw_payload={"gross_amount_minor": 50000, "net_settlement_amount_minor": 50000}
        ),
        NormalizedRecord(
            record_id="PO_2", source_type="PAYOUT", reference_tokens=["rzp", "po", "99887"],
            clean_reference="RZP-PO-99887", amount_minor=30000, currency="INR",
            timestamp_epoch=1772370000, raw_timestamp="2026-03-01T12:00:00Z",
            raw_payload={"gross_amount_minor": 30000, "net_settlement_amount_minor": 30000}
        )
    ]

    matches = matcher.match_stage1(payouts, txns)
    assert len(matches) == 2
    assert matches["PO_1"].transaction_ids == ["TXN_1"]
    assert matches["PO_2"].transaction_ids == ["TXN_2"]
    assert matches["PO_1"].is_valid is True
    assert matches["PO_2"].is_valid is True


def test_batch_subset_matching_many_to_one():
    """Verify bounded subset matching combines multiple transactions to match batch gross."""
    matcher = ReconciliationMatcher()

    # Three transactions summing to 15,000 paise (5000 + 6000 + 4000)
    txns = [
        NormalizedRecord(
            record_id="TXN_B1", source_type="TRANSACTION", reference_tokens=["bat", "777", "1"],
            clean_reference="BAT-777-1", amount_minor=5000, currency="INR",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        ),
        NormalizedRecord(
            record_id="TXN_B2", source_type="TRANSACTION", reference_tokens=["bat", "777", "2"],
            clean_reference="BAT-777-2", amount_minor=6000, currency="INR",
            timestamp_epoch=1772362000, raw_timestamp="2026-03-01T10:30:00Z"
        ),
        NormalizedRecord(
            record_id="TXN_B3", source_type="TRANSACTION", reference_tokens=["bat", "777", "3"],
            clean_reference="BAT-777-3", amount_minor=4000, currency="INR",
            timestamp_epoch=1772364000, raw_timestamp="2026-03-01T11:00:00Z"
        ),
    ]

    payouts = [
        NormalizedRecord(
            record_id="PO_BATCH", source_type="PAYOUT", reference_tokens=["rzp", "batch", "777"],
            clean_reference="RZP-BATCH-777", amount_minor=15000, currency="INR",
            timestamp_epoch=1772380000, raw_timestamp="2026-03-01T15:00:00Z",
            raw_payload={"gross_amount_minor": 15000, "net_settlement_amount_minor": 14700}
        )
    ]

    matches = matcher.match_stage1(payouts, txns)
    assert "PO_BATCH" in matches
    link = matches["PO_BATCH"]
    assert link.is_valid is True
    assert set(link.transaction_ids) == {"TXN_B1", "TXN_B2", "TXN_B3"}
    assert link.gross_sum_minor == 15000
