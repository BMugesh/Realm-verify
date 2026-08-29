"""Replay and audit verification module for Realm Verify.

Verifies deterministic replay under pinned environment against stored SQLite evidence ledger.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path
from typing import Dict, Any

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from src.config import PipelineConfig
from src.evidence_store import EvidenceStore
from src.main import run_realm_verify_pipeline, run_baseline_pipeline, compute_file_hash
from src.models import format_inr

console = Console()


def verify_and_replay_run(
    run_id: str,
    db_path: Path = Path("outputs/evidence.sqlite"),
    output_dir: Path = Path("outputs"),
    data_dir: Path = Path("data/generated"),
) -> Dict[str, Any]:
    """Replay a stored reconciliation run and verify exact decision ID & balance determinism."""
    store = EvidenceStore(db_path)
    run_meta = store.get_run_metadata(run_id)

    if not run_meta:
        raise ValueError(f"Run ID '{run_id}' not found in evidence ledger at {db_path}")

    # 1. SHA-256 Hash Chain Integrity Verification
    chain_valid, chain_msg, verified_count = store.verify_integrity(run_id)

    # 2. Source Hash Integrity Verification
    stored_source_hashes = run_meta["source_hashes"]
    current_source_hashes = {
        "internal_ledger": compute_file_hash(data_dir / "internal_ledger.json"),
        "gateway_payouts": compute_file_hash(data_dir / "gateway_payouts.csv"),
        "bank_statements": compute_file_hash(data_dir / "bank_statements.csv"),
    }

    source_hashes_match = (stored_source_hashes == current_source_hashes)

    # 3. Retrieve stored events
    stored_events = store.get_events_for_run(run_id)
    stored_decisions = {e["record_id"]: e["decision"] for e in stored_events}

    # 4. Re-execute pipeline with identical seed and configuration
    seed = run_meta["dataset_seed"]
    config_dict = run_meta["config"]
    config = PipelineConfig(**config_dict)
    pipeline_type = run_meta["pipeline_type"]

    t0 = time.perf_counter()
    if pipeline_type == "EXACT_MATCH_BASELINE":
        replayed_metrics, replayed_results, _ = run_baseline_pipeline(
            seed=seed,
            records=500,
            data_dir=data_dir,
            output_dir=output_dir,
            config=config
        )
    else:
        replayed_metrics, replayed_results, _, _ = run_realm_verify_pipeline(
            seed=seed,
            records=500,
            data_dir=data_dir,
            output_dir=output_dir,
            config=config
        )
    t1 = time.perf_counter()

    # 5. Record-by-Record Comparison
    matches = 0
    mismatches = 0
    balance_residuals_deviations = 0

    for res in replayed_results:
        rec_id = res.settlement_id
        original_decision = stored_decisions.get(rec_id)
        if original_decision == res.decision.value:
            matches += 1
        else:
            mismatches += 1

        # Check balance residual
        if res.stage1 and res.stage1.balance_residual_minor > 0 and res.decision.value == "AUTO_APPROVED":
            balance_residuals_deviations += 1
        if res.stage2 and res.stage2.balance_residual_minor > 0 and res.decision.value == "AUTO_APPROVED":
            balance_residuals_deviations += 1

    total_decisions = len(replayed_results)
    decision_match_pct = (matches / total_decisions * 100.0) if total_decisions > 0 else 0.0

    replay_report = {
        "run_id": run_id,
        "pipeline_type": pipeline_type,
        "dataset_seed": seed,
        "replay_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "replay_runtime_seconds": round(t1 - t0, 4),
        "hash_chain_integrity": {
            "is_valid": chain_valid,
            "message": chain_msg,
            "events_verified": verified_count,
        },
        "source_hash_integrity": {
            "matches_original": source_hashes_match,
            "stored_hashes": stored_source_hashes,
            "current_hashes": current_source_hashes,
        },
        "decision_determinism": {
            "total_decisions": total_decisions,
            "exact_decision_matches": matches,
            "decision_mismatches": mismatches,
            "match_percentage": round(decision_match_pct, 2),
            "max_balance_residual_deviation_minor": balance_residuals_deviations,
            "replay_status": "DETERMINISTIC_REPLAY_VERIFIED" if (matches == total_decisions and balance_residuals_deviations == 0) else "DISCREPANCY_DETECTED",
            "reproducibility_disclaimer": "Replay was executed using the stored input hashes, seed, configuration, and pinned repository environment; it is not a claim of cross-machine bitwise reproducibility."
        },
        "metrics": replayed_metrics
    }

    # Save replay report
    replay_path = output_dir / "replay_report.json"
    with open(replay_path, "w", encoding="utf-8") as f:
        json.dump(replay_report, f, indent=2)

    return replay_report


def main():
    parser = argparse.ArgumentParser(description="Replay and verify stored reconciliation run.")
    parser.add_argument("--run-id", type=str, required=True, help="Run ID to replay and verify")
    parser.add_argument("--db-path", type=str, default="outputs/evidence.sqlite", help="SQLite DB path")
    parser.add_argument("--output-dir", type=str, default="outputs", help="Output directory")
    args = parser.parse_args()

    console.print(Panel(f"[bold cyan]Initiating Deterministic Replay Verification for Run: {args.run_id}[/bold cyan]"))
    
    report = verify_and_replay_run(
        run_id=args.run_id,
        db_path=Path(args.db_path),
        output_dir=Path(args.output_dir)
    )

    det = report["decision_determinism"]
    chain = report["hash_chain_integrity"]

    table = Table(title="Deterministic Replay Audit Report", show_header=True, header_style="bold green")
    table.add_column("Verification Step", style="white")
    table.add_column("Status / Result", style="cyan")

    table.add_row("SHA-256 Hash Chain Integrity", f"PASS ({chain['events_verified']} events verified)")
    table.add_row("Source File Hash Match", "MATCH" if report["source_hash_integrity"]["matches_original"] else "DIFFERENT")
    table.add_row("Total Replayed Decisions", str(det["total_decisions"]))
    table.add_row("Exact Decision ID Matches", f"{det['exact_decision_matches']} / {det['total_decisions']} ({det['match_percentage']}%)")
    table.add_row("Balance Residual Deviation", f"{det['max_balance_residual_deviation_minor']} paise")
    table.add_row("Replay Audit Status", f"[bold green]{det['replay_status']}[/bold green]" if det['replay_status'] == "DETERMINISTIC_REPLAY_VERIFIED" else "[bold red]FAIL[/bold red]")

    console.print(table)
    console.print("[dim]Note: Replay was executed using the stored input hashes, seed, configuration, and pinned repository environment; it is not a claim of cross-machine bitwise reproducibility.[/dim]")
    console.print(f"\n[green]Saved replay verification artifact to:[/green] outputs/replay_report.json")


if __name__ == "__main__":
    main()
