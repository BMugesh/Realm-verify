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


def test_app_and_website_explanations():
    """Test 1: Assistant accurately explains the app purpose, 5-agent pipeline, and website features."""
    # Question about why app was built
    req1 = ChatRequest(
        message="can you tell me about this app clearly why this was builted ?"
    )
    resp1 = assistant_service.ask(req1)
    assert len(resp1.reply) > 50
    reply1_lower = resp1.reply.lower()
    assert "realm verify" in reply1_lower
    assert "reconciliation" in reply1_lower or "5-agent" in reply1_lower or "0-paise" in reply1_lower

    # Question about 5 agents
    req2 = ChatRequest(
        message="How do the 5 AI agents work in Realm Verify?"
    )
    resp2 = assistant_service.ask(req2)
    reply2_lower = resp2.reply.lower()
    assert "ingest" in reply2_lower
    assert "match" in reply2_lower
    assert "semantic" in reply2_lower
    assert "gatekeeper" in reply2_lower
    assert "auditor" in reply2_lower

    # Question about website navigation
    req3 = ChatRequest(
        message="how to use this website and what pages are available?"
    )
    resp3 = assistant_service.ask(req3)
    reply3_lower = resp3.reply.lower()
    assert "reconciliation studio" in reply3_lower or "exception queue" in reply3_lower or "dashboard" in reply3_lower


def test_dynamic_record_detection_in_query():
    """Test 2: Assistant dynamically detects record IDs in prompt and provides grounded facts."""
    req = ChatRequest(
        message="What is the exact residual and stage breakdown for record PO_B01_000001?"
    )
    resp = assistant_service.ask(req)
    
    assert resp.record_id == "PO_B01_000001"
    assert resp.citations is not None
    assert resp.citations.evidence_ledger_hash is not None
    assert "Stage 1 (Internal Ledger)" in resp.citations.stages
    assert resp.precomputed_facts.gross_amount_paise > 0
    assert resp.precomputed_facts.gross_amount_formatted.startswith("₹")
    assert resp.precomputed_facts.total_residual_formatted.startswith("₹")


def test_missing_record_notification():
    """Test 3: If record is not in current run, assistant alerts user to recheck record ID and question."""
    req = ChatRequest(
        message="tell me about record PO_NONEXISTENT_99999"
    )
    resp = assistant_service.ask(req)
    
    assert resp.source == "missing_record_warning"
    reply_lower = resp.reply.lower()
    assert "not found in current run" in reply_lower or "not found" in reply_lower
    assert "recheck the record id" in reply_lower or "recheck" in reply_lower
    assert "po_nonexistent_99999" in reply_lower


def test_out_of_scope_domain_refusal():
    """Test 4: Chatbot must politely refuse truly off-topic queries (recipes, weather, etc.)."""
    off_topic_queries = [
        "What is the weather in Tokyo today?",
        "Can you write a poem about flowers?",
        "What is the price of Bitcoin?",
        "Give me a recipe for chocolate cake"
    ]
    
    for query in off_topic_queries:
        req = ChatRequest(
            record_id="PO_B01_000001",
            message=query
        )
        resp = assistant_service.ask(req)
        
        assert resp.source == "guardrail_refusal"
        assert "realm verify" in resp.reply.lower()


def test_precomputed_math_and_evidence_citation():
    """Test 5: Real record arithmetic and SHA-256 evidence ledger hash citations."""
    req = ChatRequest(
        record_id="PO_B01_000001",
        message="What is the exact residual and show me the evidence ledger hash?"
    )
    resp = assistant_service.ask(req)
    
    assert resp.record_id == "PO_B01_000001"
    assert resp.citations is not None
    assert resp.citations.evidence_ledger_hash is not None
    assert len(resp.citations.evidence_ledger_hash) > 10
    assert "Stage 1 (Internal Ledger)" in resp.citations.stages
    assert "Accounting Gatekeeper" in resp.citations.stages
    assert resp.precomputed_facts.gross_amount_paise > 0


def test_unresolved_case_diagnostics():
    """Test 6: Explaining why an unresolved or exception record failed matching stages."""
    req = ChatRequest(
        record_id="PO_UNRESOLVED_TEST_001",
        message="Why is this record unresolved? Explain the stage 1 and stage 2 discrepancies."
    )
    resp = assistant_service.ask(req)
    
    assert resp.record_id == "PO_UNRESOLVED_TEST_001"
    assert len(resp.reply) > 20
    reply_lower = resp.reply.lower()
    assert "stage 1" in reply_lower or "stage 2" in reply_lower or "gatekeeper" in reply_lower or "residual" in reply_lower


def test_approval_authority_guardrail():
    """Test 7: Assistant must never claim decision authority or approve records."""
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
        assert "gatekeeper" in reply_lower or "exception queue" in reply_lower


def test_api_chat_endpoint(client):
    """Test 8: FastAPI POST /api/chat and POST /api/reconciliation/explain/{settlement_id}/chat."""
    # Test POST /api/chat with app question
    app_payload = {
        "message": "can you tell me about this app clearly why this was builted ?"
    }
    r_app = client.post("/api/chat", json=app_payload)
    assert r_app.status_code == 200
    data_app = r_app.json()
    assert "realm verify" in data_app["reply"].lower()

    # Test POST /api/chat with record question
    rec_payload = {
        "record_id": "PO_B01_000001",
        "message": "Explain the reconciliation status for this record"
    }
    r = client.post("/api/chat", json=rec_payload)
    assert r.status_code == 200
    data = r.json()
    assert data["record_id"] == "PO_B01_000001"
    assert "reply" in data
    assert "citations" in data
    assert "precomputed_facts" in data

    # Test POST /api/reconciliation/explain/{settlement_id}/chat
    r2 = client.post("/api/reconciliation/explain/PO_B01_000001/chat", json=rec_payload)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["record_id"] == "PO_B01_000001"
    assert "reply" in data2

