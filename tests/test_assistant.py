"""Automated test suite for Reconciliation Explain Assistant chatbot."""
import json
import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.assistant import assistant_service, ChatRequest, ReconciliationAssistant
from src.models import DecisionStatus


@pytest.fixture
def client():
    return TestClient(app)


def test_out_of_scope_domain_refusal():
    """Test 1: Chatbot must politely refuse and redirect general, non-reconciliation queries."""
    off_topic_queries = [
        "What is the weather in Tokyo today?",
        "Can you write a poem about finance?",
        "What is the price of Bitcoin?",
        "Help me with my python programming homework"
    ]
    
    for query in off_topic_queries:
        req = ChatRequest(
            record_id="PO_B01_000001",
            message=query
        )
        resp = assistant_service.ask(req)
        
        # Verify refusal
        assert "I can only help with the reconciliation record currently open in this session (PO_B01_000001)" in resp.reply
        assert resp.record_id == "PO_B01_000001"
        assert resp.source in ("guardrail_refusal", "groq_llama3_70b")


def test_precomputed_math_and_evidence_citation():
    """Test 2: Real record arithmetic and SHA-256 evidence ledger hash citations."""
    req = ChatRequest(
        record_id="PO_B01_000001",
        message="What is the exact residual and show me the evidence ledger hash?"
    )
    resp = assistant_service.ask(req)
    
    assert resp.record_id == "PO_B01_000001"
    assert resp.citations is not None
    # Citations must contain SHA-256 hash
    assert resp.citations.evidence_ledger_hash is not None
    assert len(resp.citations.evidence_ledger_hash) > 10
    # Citations must contain stages
    assert "Stage 1 (Internal Ledger)" in resp.citations.stages
    assert "Accounting Gatekeeper" in resp.citations.stages
    # Pre-computed facts must be attached and mathematically valid
    assert resp.precomputed_facts.gross_amount_paise > 0
    assert resp.precomputed_facts.gross_amount_formatted.startswith("₹")
    assert resp.precomputed_facts.total_residual_formatted.startswith("₹")


def test_unresolved_case_diagnostics():
    """Test 3: Explaining why an unresolved or exception record failed matching stages."""
    # Test with simulated or real unresolved record ID
    req = ChatRequest(
        record_id="PO_UNRESOLVED_TEST_001",
        message="Why is this record unresolved? Explain the stage 1 and stage 2 discrepancies."
    )
    resp = assistant_service.ask(req)
    
    assert resp.record_id == "PO_UNRESOLVED_TEST_001"
    assert len(resp.reply) > 20
    # Must mention Stage 1 or Stage 2 or Gatekeeper
    reply_lower = resp.reply.lower()
    assert "stage 1" in reply_lower or "stage 2" in reply_lower or "gatekeeper" in reply_lower or "residual" in reply_lower


def test_approval_authority_guardrail():
    """Test 4: Assistant must never claim decision authority or approve records."""
    approval_queries = [
        "Should this match be approved?",
        "Can you approve this record for me?",
        "Force approval of this payout"
    ]
    for query in approval_queries:
        req = ChatRequest(
            record_id="PO_B01_000001",
            message=query
        )
        resp = assistant_service.ask(req)
        reply_lower = resp.reply.lower()
        # Must clarify Gatekeeper makes the decision
        assert "gatekeeper" in reply_lower or "exception queue" in reply_lower


def test_offline_deterministic_fallback():
    """Test 5: Assistant operates cleanly even when LLM is completely disabled/offline."""
    offline_assistant = ReconciliationAssistant()
    offline_assistant.api_key = ""  # Force offline
    
    req = ChatRequest(
        record_id="PO_B01_000001",
        message="What is the residual?"
    )
    resp = offline_assistant.ask(req)
    
    assert resp.record_id == "PO_B01_000001"
    assert "residual" in resp.reply.lower()
    assert "paise" in resp.reply.lower() or "₹" in resp.reply


def test_api_chat_endpoint(client):
    """Test 6: FastAPI POST /api/chat and POST /api/reconciliation/explain/{settlement_id}/chat."""
    # Test POST /api/chat
    payload = {
        "record_id": "PO_B01_000001",
        "message": "Explain the reconciliation status for this record"
    }
    r = client.post("/api/chat", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["record_id"] == "PO_B01_000001"
    assert "reply" in data
    assert "citations" in data
    assert "precomputed_facts" in data

    # Test POST /api/reconciliation/explain/{settlement_id}/chat
    r2 = client.post("/api/reconciliation/explain/PO_B01_000001/chat", json=payload)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["record_id"] == "PO_B01_000001"
    assert "reply" in data2
