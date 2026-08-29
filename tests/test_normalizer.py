"""Unit tests for data normalization and tokenization."""
import pytest
from src.normalizer import extract_reference_tokens, parse_timestamp_to_epoch, DataNormalizer


def test_extract_reference_tokens():
    """Verify reference token extraction and stopword removal."""
    text1 = "RZP-PO-882194"
    tokens1 = extract_reference_tokens(text1)
    assert "882194" in tokens1

    text2 = "CMS/HDFC/RZP-PO-882194/AMZN"
    tokens2 = extract_reference_tokens(text2)
    assert "882194" in tokens2
    assert "amzn" in tokens2
    assert "cms" not in tokens2  # Stopword removed


def test_parse_timestamp_to_epoch():
    """Verify ISO timestamp parsing to UTC epoch integer."""
    ts = "2026-03-01T12:00:00Z"
    epoch = parse_timestamp_to_epoch(ts)
    assert isinstance(epoch, int)
    assert epoch > 1700000000


def test_normalizer_valid_and_malformed():
    """Verify normalizer segregates valid and malformed records without failing open."""
    normalizer = DataNormalizer()
    
    raw_txns = [
        {
            "transaction_id": "TXN_1",
            "customer_reference": "AMZN-INV-100",
            "gross_amount_minor": 5000,
            "net_amount_minor": 5000,
            "currency": "INR",
            "created_at": "2026-03-01T10:00:00Z",
            "payment_status": "captured"
        },
        {
            # Malformed: missing required fields
            "transaction_id": "TXN_BAD",
            "currency": "INR"
        }
    ]

    norm = normalizer.normalize_transactions(raw_txns)
    assert len(norm) == 1
    assert norm[0].record_id == "TXN_1"
    assert len(normalizer.malformed_records) == 1
