"""Unit tests for optional LLM candidate re-ranker and graceful fallback."""
import pytest
from unittest.mock import patch, MagicMock
from src.models import NormalizedRecord, LLMRerankResponse
from src.llm_reranker import LLMReranker
from src.config import PipelineConfig


def test_llm_reranker_disabled_fallback():
    """Verify that when no API key is provided, candidate list is returned unmodified."""
    config = PipelineConfig(llm_api_key="")
    reranker = LLMReranker(config)
    assert reranker.is_enabled is False

    query = NormalizedRecord(
        record_id="PO_1", source_type="PAYOUT", reference_tokens=["ambig", "100"],
        clean_reference="AMBIG-PO-100", amount_minor=5000, currency="INR",
        timestamp_epoch=1772370000, raw_timestamp="2026-03-01T12:00:00Z"
    )
    candidates = [
        (NormalizedRecord(
            record_id="TXN_A", source_type="TRANSACTION", reference_tokens=["ambig"],
            clean_reference="AMBIG-A", amount_minor=5000, currency="INR",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        ), 0.65),
        (NormalizedRecord(
            record_id="TXN_B", source_type="TRANSACTION", reference_tokens=["ambig"],
            clean_reference="AMBIG-B", amount_minor=5000, currency="INR",
            timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
        ), 0.60),
    ]

    reranked, rationale = reranker.rerank_candidates(query, candidates)
    assert reranked == candidates
    assert rationale is None


def test_llm_reranker_schema_validation_and_reordering():
    """Verify structured schema parsing reorders candidate proposals."""
    config = PipelineConfig(llm_api_key="sk-test-key-mock-valid")
    reranker = LLMReranker(config)
    assert reranker.is_enabled is True

    query = NormalizedRecord(
        record_id="PO_1", source_type="PAYOUT", reference_tokens=["po", "9912"],
        clean_reference="RZP-PO-9912", amount_minor=5000, currency="INR",
        timestamp_epoch=1772370000, raw_timestamp="2026-03-01T12:00:00Z"
    )
    cand_a = NormalizedRecord(
        record_id="TXN_A", source_type="TRANSACTION", reference_tokens=["inv", "1111"],
        clean_reference="INV-1111", amount_minor=5000, currency="INR",
        timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
    )
    cand_b = NormalizedRecord(
        record_id="TXN_B", source_type="TRANSACTION", reference_tokens=["inv", "9912"],
        clean_reference="INV-9912", amount_minor=5000, currency="INR",
        timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
    )
    candidates = [(cand_a, 0.50), (cand_b, 0.50)]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{
            "message": {
                "content": '{"ranked_candidate_ids": ["TXN_B", "TXN_A"], "confidence": 0.95, "rationale": "Token 9912 matches exactly", "extracted_tokens": ["9912"]}'
            }
        }]
    }

    with patch("requests.post", return_value=mock_resp):
        reranked, rationale = reranker.rerank_candidates(query, candidates)
        assert len(reranked) == 2
        assert reranked[0][0].record_id == "TXN_B"
        assert reranked[0][1] == 0.95
        assert "9912 matches" in rationale


def test_llm_reranker_malformed_json_fallback():
    """Verify that malformed LLM responses safely fallback without failing open."""
    config = PipelineConfig(llm_api_key="sk-test-key-mock-valid")
    reranker = LLMReranker(config)

    query = NormalizedRecord(
        record_id="PO_1", source_type="PAYOUT", reference_tokens=["test"],
        clean_reference="REF", amount_minor=5000, currency="INR",
        timestamp_epoch=1772370000, raw_timestamp="2026-03-01T12:00:00Z"
    )
    cand1 = NormalizedRecord(
        record_id="TXN_1", source_type="TRANSACTION", reference_tokens=["test"],
        clean_reference="REF1", amount_minor=5000, currency="INR",
        timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
    )
    cand2 = NormalizedRecord(
        record_id="TXN_2", source_type="TRANSACTION", reference_tokens=["test"],
        clean_reference="REF2", amount_minor=5000, currency="INR",
        timestamp_epoch=1772360000, raw_timestamp="2026-03-01T10:00:00Z"
    )
    candidates = [(cand1, 0.50), (cand2, 0.40)]

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{
            "message": {
                "content": 'NOT_VALID_JSON'
            }
        }]
    }

    with patch("requests.post", return_value=mock_resp):
        reranked, rationale = reranker.rerank_candidates(query, candidates)
        assert reranked == candidates
        assert rationale is not None
        assert "LLM fallback" in rationale
