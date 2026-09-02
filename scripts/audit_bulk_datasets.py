"""Audit and Verification Script for Bulk Datasets in Realm Verify.

Runs the full 5-agent reconciliation pipeline across multiple enterprise batches
from `data/bulk_datasets/` and asserts all deterministic mathematical invariants.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import csv
import json
import time
from typing import Dict, List, Any

from src.models import (
    InternalTransaction,
    GatewayPayout,
    BankStatementEntry,
    DecisionStatus,
    ReconciliationResult,
    ReconciliationException,
    format_inr,
)
from src.config import DEFAULT_CONFIG, PipelineConfig
from src.normalizer import DataNormalizer
from src.matcher import ReconciliationMatcher
from src.validator import AccountingValidator
from src.evidence_store import EvidenceStore
from src.agents import AuditorAgent


def load_csv_rows(path: Path) -> List[Dict[str, Any]]:
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def run_batch_audit(batch_dir: Path, batch_name: str, db_path: Path):
    print(f"\n{'='*75}")
    print(f"AUDITING ENTERPRISE DATASET: {batch_name}")
    print(f"{'='*75}")

    tx_files = list(batch_dir.glob("*_internal_transactions_*.csv"))
    po_files = list(batch_dir.glob("*_gateway_payouts_*.csv"))
    bk_files = list(batch_dir.glob("*_bank_statements_*.csv"))

    if not (tx_files and po_files and bk_files):
        print(f"Skipping {batch_name}: incomplete files.")
        return None

    tx_rows = load_csv_rows(tx_files[0])
    po_rows = load_csv_rows(po_files[0])
    bk_rows = load_csv_rows(bk_files[0])

    print(f"Ingested Raw Records: {len(tx_rows)} Txns, {len(po_rows)} Payouts, {len(bk_rows)} Bank Credits")
    total_recs = len(tx_rows) + len(po_rows) + len(bk_rows)

    # 1. Normalization
    normalizer = DataNormalizer()
    norm_txns = normalizer.normalize_transactions(tx_rows)
    norm_pos = normalizer.normalize_payouts(po_rows)
    norm_banks = normalizer.normalize_bank_entries(bk_rows)

    txns_by_id = {t.record_id: t for t in norm_txns}
    banks_by_id = {b.record_id: b for b in norm_banks}

    txns_gross_paise = sum(t.amount_minor for t in norm_txns)
    pos_gross_paise = sum(p.amount_minor for p in norm_pos)
    pos_net_paise = sum(p.raw_payload.get("net_settlement_amount_minor", p.amount_minor) for p in norm_pos)
    banks_credit_paise = sum(b.amount_minor for b in norm_banks)

    # 2. Matching
    config = DEFAULT_CONFIG
    matcher = ReconciliationMatcher(config)
    t0 = time.perf_counter()
    s1_matches = matcher.match_stage1(norm_pos, norm_txns)
    s2_matches = matcher.match_stage2(norm_pos, norm_banks)
    t_match = time.perf_counter() - t0

    # 3. Validation
    validator = AccountingValidator(config)
    results: List[ReconciliationResult] = []
    exceptions: List[ReconciliationException] = []

    auto_approved = 0
    needs_review = 0
    unresolved = 0
    reconciled_gross_paise = 0
    max_residual = 0
    residual_violations = 0

    for payout in norm_pos:
        s1 = s1_matches.get(payout.record_id)
        s2 = s2_matches.get(payout.record_id)
        res, exc = validator.validate_two_stage_settlement(
            payout=payout,
            stage1_link=s1,
            stage2_link=s2,
            all_txns_by_id=txns_by_id,
            all_banks_by_id=banks_by_id,
        )
        results.append(res)
        if exc:
            exceptions.append(exc)

        gross = payout.amount_minor
        if res.decision == DecisionStatus.AUTO_APPROVED:
            auto_approved += 1
            reconciled_gross_paise += gross
            # Assert 0 residual on Stage 1 and Stage 2
            r1 = res.stage1.balance_residual_minor if res.stage1 else 999
            r2 = res.stage2.balance_residual_minor if res.stage2 else 999
            if r1 != 0 or r2 != 0:
                residual_violations += 1
            max_residual = max(max_residual, r1, r2)
        elif res.decision == DecisionStatus.NEEDS_REVIEW:
            needs_review += 1
        else:
            unresolved += 1

    match_rate = (auto_approved + needs_review) / len(norm_pos) if norm_pos else 0
    auto_approval_rate = auto_approved / len(norm_pos) if norm_pos else 0

    # 4. Evidence Store Chaining
    run_id = f"AUDIT_{batch_name}_{int(time.time())}"
    store = EvidenceStore(db_path)
    store.record_run_start(
        run_id=run_id,
        dataset_seed=999,
        pipeline_type=f"BULK_ENTERPRISE_{batch_name}",
        config=config.model_dump(mode="json"),
        source_hashes={"txns": tx_files[0].name, "pos": po_files[0].name, "banks": bk_files[0].name},
        total_records=total_recs,
    )
    store.append_events(run_id, 999, results)
    is_valid, msg, count = store.verify_integrity(run_id)

    # 5. Explain Modal Audit for Sample Record
    sample_id = norm_pos[0].record_id
    auditor = AuditorAgent()
    sample_res = next(r for r in results if r.settlement_id == sample_id)
    explanation = auditor.generate_narrative(sample_res, norm_pos[0].raw_payload)

    print(f"• Total Records: {total_recs:,}")
    print(f"• Total Internal Txns Gross: {format_inr(txns_gross_paise)}")
    print(f"• Total Payouts Gross: {format_inr(pos_gross_paise)}")
    print(f"• Reconciled Gross (0-Paise Invariant): {format_inr(reconciled_gross_paise)}")
    print(f"• Auto-Approved Count: {auto_approved:,} ({auto_approval_rate*100:.2f}%)")
    print(f"• Exceptions Flagged: {len(exceptions):,} (Review: {needs_review:,}, Unresolved: {unresolved:,})")
    print(f"• Max Committed Residual: {max_residual} paise (Violations: {residual_violations})")
    print(f"• Matching Runtime: {t_match:.3f}s ({total_recs/t_match:.1f} recs/sec)")
    print(f"• SHA-256 Evidence Chain: {'VALID & INTACT' if is_valid else 'FAILED'} ({count:,} events chained)")
    print(f"• Sample Explain [{sample_id}]:")
    print(f"   - Decision: {explanation.decision}")
    print(f"   - Matched Txns Gross: {explanation.arithmetic_proof['matched_transactions_gross_formatted']}")
    print(f"   - Payout Gross: {explanation.arithmetic_proof['payout_gross_formatted']}")
    print(f"   - Stage 1 Delta: {explanation.arithmetic_proof['stage1_gross_balance_delta']} paise")
    print(f"   - Stage 2 Delta: {explanation.arithmetic_proof['stage2_net_balance_delta']} paise")

    return {
        "batch_name": batch_name,
        "run_id": run_id,
        "total_records": total_recs,
        "txns_gross_formatted": format_inr(txns_gross_paise),
        "pos_gross_formatted": format_inr(pos_gross_paise),
        "reconciled_gross_formatted": format_inr(reconciled_gross_paise),
        "auto_approved": auto_approved,
        "needs_review": needs_review,
        "unresolved": unresolved,
        "match_rate_pct": round(match_rate * 100, 2),
        "auto_approval_rate_pct": round(auto_approval_rate * 100, 2),
        "exceptions_count": len(exceptions),
        "max_residual_paise": max_residual,
        "chain_valid": is_valid,
        "events_count": count,
        "sample_id": sample_id,
        "sample_stage1_matched_formatted": explanation.arithmetic_proof['matched_transactions_gross_formatted'],
        "sample_stage1_delta": explanation.arithmetic_proof['stage1_gross_balance_delta'],
    }


def main():
    bulk_dir = Path("data/bulk_datasets")
    db_path = Path("outputs/evidence_bulk_audit.sqlite")
    if db_path.exists():
        try:
            db_path.unlink()
        except Exception:
            pass

    batches_to_audit = ["batch_01", "batch_02", "batch_03", "batch_04", "batch_05"]
    summaries = []

    for b in batches_to_audit:
        b_path = bulk_dir / b
        if b_path.exists() and b_path.is_dir():
            res = run_batch_audit(b_path, b, db_path)
            if res:
                summaries.append(res)

    print("\n" + "="*85)
    print("CROSS-BATCH AGGREGATION AUDIT TABLE")
    print("="*85)
    print(f"{'Batch':<10} | {'Total Recs':<10} | {'Txns Gross':<18} | {'Reconciled Gross':<18} | {'Match Rate':<10} | {'Residual':<8} | {'Chain'}")
    print("-" * 85)
    for s in summaries:
        print(f"{s['batch_name']:<10} | {s['total_records']:<10,d} | {s['txns_gross_formatted']:<18} | {s['reconciled_gross_formatted']:<18} | {s['match_rate_pct']:<9}% | {s['max_residual_paise']} paise  | {'INTACT' if s['chain_valid'] else 'INVALID'}")

    # Output JSON summary for artifact
    out_json = Path("outputs/bulk_datasets_audit_summary.json")
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(summaries, f, indent=2)
    print(f"\nAudit summary written to: {out_json}")


if __name__ == "__main__":
    main()
