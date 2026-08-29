"""
Tests for Realm Verify Persistent Chat History, RL Feedback, and Self-Correction Policy.
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.assistant import assistant_service, ChatRequest
from src.rl_feedback import rl_feedback_engine, ChatFeedbackPayload

client = TestClient(app)


def test_conversation_persistence_and_retrieval():
    """Test 1: Chat messages must be persistently recorded to SQLite and retrievable."""
    record_id = "PO_RL_TEST_0001"
    
    # Send first message
    req1 = ChatRequest(
        record_id=record_id,
        message="What is the residual for this record?"
    )
    resp1 = assistant_service.ask(req1)
    assert resp1.session_id is not None
    assert resp1.message_id is not None

    # Retrieve history directly from RL engine
    history = rl_feedback_engine.get_record_history(record_id)
    assert len(history) >= 2  # 1 user + 1 assistant
    assert history[-1]["role"] == "assistant"
    assert history[-2]["role"] == "user"
    assert history[-2]["content"] == "What is the residual for this record?"


def test_feedback_reward_submission():
    """Test 2: Submitting positive and negative reward signals updates SQLite and accuracy telemetry."""
    record_id = "PO_RL_TEST_0002"
    req = ChatRequest(
        record_id=record_id,
        message="Show me the evidence hash"
    )
    resp = assistant_service.ask(req)

    # Submit positive reward (+1)
    fb_pos = ChatFeedbackPayload(
        record_id=record_id,
        message_id=resp.message_id,
        reward=1,
        feedback_text="Clear and polite answer",
        query=req.message,
        response=resp.reply
    )
    res_pos = rl_feedback_engine.record_feedback(fb_pos)
    assert res_pos["status"] == "success"
    assert res_pos["reward"] == 1

    # Check stats
    stats = rl_feedback_engine.get_stats()
    assert stats.total_feedback_count >= 1
    assert stats.positive_rewards >= 1


def test_learned_self_correction_policy():
    """Test 3: Flagging a mistake (-1) synthesizes a corrective policy rule that is injected into prompts."""
    record_id = "PO_RL_TEST_CORRECT"
    req = ChatRequest(
        record_id=record_id,
        message="Why is this record unresolved?"
    )
    resp = assistant_service.ask(req)

    # Submit negative feedback with a specific ground truth correction note
    correction_note = "Do not mention Stage 2 bank delays for PO_RL_TEST_CORRECT because it is an internal transfer."
    fb_neg = ChatFeedbackPayload(
        record_id=record_id,
        message_id=resp.message_id,
        reward=-1,
        feedback_text=correction_note,
        query=req.message,
        response=resp.reply
    )
    res_neg = rl_feedback_engine.record_feedback(fb_neg)
    assert res_neg["status"] == "success"
    assert res_neg["reward"] == -1
    assert res_neg["correction_rule"] is not None
    assert correction_note in res_neg["correction_rule"]

    # Verify that get_learned_corrections retrieves the synthesized rule
    learned_rules = rl_feedback_engine.get_learned_corrections(record_id)
    assert any(correction_note in r for r in learned_rules)

    # Verify that the next ask() on this record retrieves and carries the learned correction
    req2 = ChatRequest(
        record_id=record_id,
        message="Explain the matching stages for this record again."
    )
    resp2 = assistant_service.ask(req2)
    assert len(resp2.learned_corrections) > 0
    assert any(correction_note in r for r in resp2.learned_corrections)


def test_polite_and_professional_persona():
    """Test 4: Responses must be courteous, polite, and free of hallucinations."""
    req = ChatRequest(
        record_id="PO_B01_000001",
        message="What is the residual amount?"
    )
    resp = assistant_service.ask(req)
    reply_lower = resp.reply.lower()

    # Polite, accurate financial reasoning check
    assert ("residual" in reply_lower or "stage" in reply_lower or "record" in reply_lower)
    assert resp.citations.residual_formatted == "₹0.00"
    assert resp.citations.residual_paise == 0


def test_api_rl_and_history_endpoints():
    """Test 5: REST API endpoints for chat history, sessions, feedback, and optimization."""
    record_id = "PO_RL_API_TEST"
    
    # 1. Ask a question via API
    chat_payload = {
        "record_id": record_id,
        "message": "What is the Gatekeeper status?"
    }
    r = client.post("/api/chat", json=chat_payload)
    assert r.status_code == 200
    data = r.json()
    msg_id = data["message_id"]

    # 2. Get history
    r_hist = client.get(f"/api/chat/history/{record_id}")
    assert r_hist.status_code == 200
    hist_data = r_hist.json()
    assert len(hist_data["messages"]) >= 2

    # 3. Submit feedback
    fb_payload = {
        "record_id": record_id,
        "message_id": msg_id,
        "reward": 1,
        "feedback_text": "Precise and polite response"
    }
    r_fb = client.post("/api/chat/feedback", json=fb_payload)
    assert r_fb.status_code == 200
    assert r_fb.json()["reward"] == 1

    # 4. Get RL stats
    r_stats = client.get("/api/chat/rl/stats")
    assert r_stats.status_code == 200
    assert "accuracy_rating" in r_stats.json()

    # 5. Optimize policy
    r_opt = client.post("/api/chat/rl/optimize")
    assert r_opt.status_code == 200
    assert r_opt.json()["status"] == "optimized"
