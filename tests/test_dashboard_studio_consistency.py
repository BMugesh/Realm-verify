"""Test suite asserting Dashboard and Reconciliation Studio telemetry consistency."""
import pytest
from fastapi.testclient import TestClient

from src.api import app, CURRENT_RUN_FILE, RUNS_DIR


@pytest.fixture
def client():
    return TestClient(app)


def test_dashboard_and_studio_totals_match_for_synthetic_run(client):
    """Assert that Dashboard and Studio metrics read from the same canonical source for synthetic runs."""
    resp = client.post("/api/reconciliation/run", json={"seed": 42, "records": 100})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    run_id = data["run_id"]

    curr_resp = client.get("/api/runs/current/summary")
    assert curr_resp.status_code == 200
    curr_data = curr_resp.json()
    assert curr_data["has_run"] is True
    assert curr_data["summary"]["run_id"] == run_id

    run_resp = client.get(f"/api/runs/{run_id}/summary")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["has_run"] is True
    assert run_data["summary"]["run_id"] == run_id

    dashboard_total_records = curr_data["summary"]["total_source_records"]
    dashboard_reconciled_val = curr_data["summary"]["reconciled_value_formatted"]
    dashboard_reconciled_paise = curr_data["summary"]["reconciled_value_minor"]
    dashboard_unreconciled_paise = curr_data["summary"]["unreconciled_value_minor"]
    dashboard_auto_approved = curr_data["summary"]["auto_approved_count"]
    dashboard_needs_review = curr_data["summary"]["needs_review_count"]
    dashboard_unresolved = curr_data["summary"]["unresolved_count"]
    dashboard_txns = curr_data["summary"]["txns_count"]
    dashboard_pos = curr_data["summary"]["payouts_count"]
    dashboard_banks = curr_data["summary"]["banks_count"]

    studio_total_records = run_data["summary"]["total_source_records"]
    studio_reconciled_val = run_data["summary"]["reconciled_value_formatted"]
    studio_reconciled_paise = run_data["summary"]["reconciled_value_minor"]
    studio_unreconciled_paise = run_data["summary"]["unreconciled_value_minor"]
    studio_auto_approved = run_data["summary"]["auto_approved_count"]
    studio_needs_review = run_data["summary"]["needs_review_count"]
    studio_unresolved = run_data["summary"]["unresolved_count"]
    studio_txns = run_data["summary"]["txns_count"]
    studio_pos = run_data["summary"]["payouts_count"]
    studio_banks = run_data["summary"]["banks_count"]

    assert dashboard_total_records == studio_total_records == (dashboard_txns + dashboard_pos + dashboard_banks)
    assert dashboard_reconciled_val == studio_reconciled_val
    assert dashboard_reconciled_paise == studio_reconciled_paise
    assert dashboard_unreconciled_paise == studio_unreconciled_paise
    assert dashboard_auto_approved == studio_auto_approved
    assert dashboard_needs_review == studio_needs_review
    assert dashboard_unresolved == studio_unresolved
    assert (dashboard_auto_approved + dashboard_needs_review + dashboard_unresolved) == dashboard_pos


def test_dashboard_and_studio_totals_match_for_custom_upload(client):
    """Assert that Dashboard and Studio metrics read from the same canonical source for custom uploads."""
    payload = {
        "dataset_name": "Test Enterprise Verification Batch",
        "internal_transactions": [
            {
                "transaction_id": "TXN_CONSIST_001",
                "customer_reference": "AMZN-INV-1001",
                "gross_amount_minor": 50000,
                "currency": "INR",
                "created_at": "2026-08-20T10:00:00Z"
            },
            {
                "transaction_id": "TXN_CONSIST_002",
                "customer_reference": "FLPK-INV-2002",
                "gross_amount_minor": 75000,
                "currency": "INR",
                "created_at": "2026-08-20T11:00:00Z"
            }
        ],
        "gateway_payouts": [
            {
                "payout_id": "PO_CONSIST_001",
                "gateway_reference": "AMZN-INV-1001",
                "gross_amount_minor": 50000,
                "processing_fee_minor": 1000,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": 49000,
                "currency": "INR",
                "settlement_timestamp": "2026-08-21T02:00:00Z"
            },
            {
                "payout_id": "PO_CONSIST_002",
                "gateway_reference": "FLPK-INV-2002",
                "gross_amount_minor": 75000,
                "processing_fee_minor": 1500,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": 73500,
                "currency": "INR",
                "settlement_timestamp": "2026-08-21T03:00:00Z"
            }
        ],
        "bank_statements": [
            {
                "bank_entry_id": "BNK_CONSIST_001",
                "bank_name": "HDFC Bank Ltd",
                "bank_narration": "CMS/CR/AMZN-INV-1001/NET",
                "credit_amount_minor": 49000,
                "currency": "INR",
                "value_date": "2026-08-21"
            },
            {
                "bank_entry_id": "BNK_CONSIST_002",
                "bank_name": "ICICI Bank Pvt Ltd",
                "bank_narration": "CMS/CR/FLPK-INV-2002/NET",
                "credit_amount_minor": 73500,
                "currency": "INR",
                "value_date": "2026-08-21"
            }
        ]
    }

    upload_resp = client.post("/api/reconciliation/upload-run", json=payload)
    assert upload_resp.status_code == 200
    upload_data = upload_resp.json()
    assert upload_data["success"] is True
    run_id = upload_data["run_id"]

    curr_resp = client.get("/api/runs/current/summary")
    assert curr_resp.status_code == 200
    curr_data = curr_resp.json()

    assert curr_data["summary"]["run_id"] == run_id
    assert curr_data["summary"]["total_source_records"] == 6
    assert curr_data["summary"]["txns_count"] == 2
    assert curr_data["summary"]["payouts_count"] == 2
    assert curr_data["summary"]["banks_count"] == 2
    assert curr_data["summary"]["auto_approved_count"] == 2
    assert curr_data["summary"]["reconciled_value_minor"] == 125000
    assert curr_data["summary"]["reconciled_value_formatted"] == "₹1,250.00"
