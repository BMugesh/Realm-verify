"""End-to-end integration tests for Realm Verify pipeline, evidence ledger, and deterministic replay."""
import pytest
from pathlib import Path

from src.main import run_realm_verify_pipeline, run_baseline_pipeline
from src.replay import verify_and_replay_run
from src.evidence_store import EvidenceStore
from src.models import DecisionStatus


def test_end_to_end_pipeline_and_evidence_ledger(tmp_path):
    """Verify full pipeline execution, zero invalid matches, and SQLite hash chain integrity."""
    data_dir = tmp_path / "data"
    output_dir = tmp_path / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Run Realm Verify on seed 42
    metrics, results, exceptions, run_id = run_realm_verify_pipeline(
        seed=42,
        records=100,
        data_dir=data_dir,
        output_dir=output_dir
    )

    # Check key safety properties
    assert metrics["invalid_committed_matches"] == 0
    assert metrics["invalid_committed_match_rate"] == 0.0
    assert metrics["max_balance_residual_minor"] == 0
    assert metrics["end_to_end_f1"] > 0.60
    assert len(results) > 0

    # 2. Check SQLite Evidence Store integrity
    evidence_db = output_dir / "evidence.sqlite"
    assert evidence_db.exists()
    store = EvidenceStore(evidence_db)
    is_valid, msg, count = store.verify_integrity(run_id)
    assert is_valid is True
    assert count == len(results)

    # 3. Test deterministic replay
    replay_report = verify_and_replay_run(
        run_id=run_id,
        db_path=evidence_db,
        output_dir=output_dir,
        data_dir=data_dir
    )
    assert replay_report["decision_determinism"]["replay_status"] == "DETERMINISTIC_REPLAY_VERIFIED"
    assert replay_report["decision_determinism"]["match_percentage"] == 100.0
    assert replay_report["decision_determinism"]["max_balance_residual_deviation_minor"] == 0


def test_single_source_of_truth_canonical_summary():
    """Verify that uploading custom files generates identical totals across all summary endpoints."""
    from fastapi.testclient import TestClient
    from src.api import app

    client = TestClient(app)

    # 1. Custom upload payload
    custom_payload = {
        "dataset_name": "Test Enterprise Verification Batch",
        "internal_transactions": [
            {"txn_id": "TXN_001", "customer_reference": "REF_PO_001", "gross_amount_minor": 50000, "currency": "INR", "status": "SETTLED", "created_at": "2026-08-20T10:00:00Z"},
            {"txn_id": "TXN_002", "customer_reference": "REF_PO_002", "gross_amount_minor": 75200, "currency": "INR", "status": "SETTLED", "created_at": "2026-08-20T11:00:00Z"},
        ],
        "gateway_payouts": [
            {"payout_id": "PO_001", "gross_amount_minor": 50000, "processing_fee_minor": 1000, "net_settlement_amount_minor": 49000, "currency": "INR", "status": "PROCESSED", "settlement_timestamp": "2026-08-21T10:00:00Z"},
            {"payout_id": "PO_002", "gross_amount_minor": 75200, "processing_fee_minor": 1500, "net_settlement_amount_minor": 73700, "currency": "INR", "status": "PROCESSED", "settlement_timestamp": "2026-08-21T11:00:00Z"},
        ],
        "bank_statements": [
            {"bank_entry_id": "BNK_001", "bank_reference": "PO_001", "narration": "SETTLEMENT PO_001", "credit_amount_minor": 49000, "currency": "INR", "value_date": "2026-08-21", "settlement_timestamp": "2026-08-21T10:00:00Z"},
            {"bank_entry_id": "BNK_002", "bank_reference": "PO_002", "narration": "SETTLEMENT PO_002", "credit_amount_minor": 73700, "currency": "INR", "value_date": "2026-08-21", "settlement_timestamp": "2026-08-21T11:00:00Z"},
        ]
    }

    # 2. Upload run
    upload_res = client.post("/api/reconciliation/upload-run", json=custom_payload)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["success"] is True
    run_id = upload_data["run_id"]
    summary = upload_data["summary"]

    assert summary["run_id"] == run_id
    assert summary["total_source_records"] == 6  # 2 + 2 + 2
    assert summary["txns_count"] == 2
    assert summary["payouts_count"] == 2
    assert summary["banks_count"] == 2
    assert summary["reconciled_value_minor"] == 125200  # 50000 + 75200
    assert summary["reconciled_value_formatted"] == "₹1,252.00"

    # 3. Check /api/runs/current/summary
    curr_res = client.get("/api/runs/current/summary")
    assert curr_res.status_code == 200
    curr_data = curr_res.json()
    assert curr_data["has_run"] is True
    assert curr_data["summary"]["run_id"] == run_id
    assert curr_data["summary"]["total_source_records"] == 6
    assert curr_data["summary"]["reconciled_value_minor"] == 125200
    assert curr_data["summary"]["reconciled_value_formatted"] == "₹1,252.00"

    # 4. Check /api/reconciliation/latest
    latest_res = client.get("/api/reconciliation/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["run_id"] == run_id
    assert latest_data["total_source_records"] == 6
    assert latest_data["reconciled_value_minor"] == 125200
    assert latest_data["reconciled_value_formatted"] == "₹1,252.00"

    # 5. Check /api/analytics/charts
    charts_res = client.get("/api/analytics/charts")
    assert charts_res.status_code == 200
    charts_data = charts_res.json()
    assert charts_data["flow_stream"]["internal_transactions"]["count"] == 2
    assert charts_data["flow_stream"]["gateway_payouts"]["count"] == 2
    assert charts_data["flow_stream"]["bank_credits"]["count"] == 2
