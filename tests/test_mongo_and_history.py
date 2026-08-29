"""
Tests for Zero Initial State, Reconciliation History, and MongoDB Atlas Persistence.
"""

import pytest
from fastapi.testclient import TestClient
from src.api import app
from src.mongo_store import mongo_atlas_store

client = TestClient(app)


def test_mongodb_status_endpoint():
    """Test 1: MongoDB status endpoint returns cluster details and connection telemetry."""
    res = client.get("/api/mongodb/status")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "mkbm1307_db_user"
    assert data["cluster"] == "realm1.litipri.mongodb.net"
    assert data["database"] == "realm_verify"
    assert data["driver"] == "pymongo"


def test_reconciliation_history_endpoint():
    """Test 2: Reconciliation history endpoint returns all recorded historical batches and MongoDB telemetry."""
    res = client.get("/api/reconciliation/history")
    assert res.status_code == 200
    data = res.json()
    assert "total_runs" in data
    assert "runs" in data
    assert "mongodb_status" in data
    assert isinstance(data["runs"], list)


def test_clear_active_run_to_zero_state():
    """Test 3: DELETE /api/runs/current clears active run and resets dashboard to clean zero state."""
    res = client.delete("/api/runs/current")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "cleared"


def test_mongo_store_fallback_and_sync_methods():
    """Test 4: MongoAtlasStore methods handle persistence safely without exceptions."""
    # Test save run summary
    test_run = {
        "run_id": "RUN_TEST_SYNC_001",
        "dataset_name": "Test Sync Dataset",
        "reconciled_value_formatted": "₹1,000.00",
        "total_source_records": 5,
    }
    # Should not raise exception
    mongo_atlas_store.save_run_summary(test_run)

    # Test save chat message
    test_chat = {
        "message_id": "msg_test_001",
        "record_id": "PO_TEST_001",
        "role": "user",
        "content": "What is the residual?",
    }
    mongo_atlas_store.save_chat_message(test_chat)

    # Test save feedback
    test_fb = {
        "feedback_id": "fb_test_001",
        "message_id": "msg_test_001",
        "record_id": "PO_TEST_001",
        "reward": 1,
    }
    mongo_atlas_store.save_feedback(test_fb)
