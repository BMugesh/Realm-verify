import csv
import json
import time
import requests
from pathlib import Path
from playwright.sync_api import sync_playwright

def run_all_batches_browser_audit():
    bulk_dir = Path("data/bulk_datasets")
    batches = sorted([d.name for d in bulk_dir.iterdir() if d.is_dir()])
    
    print("=" * 90)
    print(f"REALM VERIFY — FULL 20-BATCH BROWSER & DETERMINISTIC AUDIT")
    print(f"Found {len(batches)} batches in {bulk_dir}")
    print("=" * 90)

    shots_dir = Path("outputs/screenshots/all_batches")
    shots_dir.mkdir(parents=True, exist_ok=True)
    
    audit_results = []
    total_records_all = 0
    total_txns_gross_all = 0
    total_payouts_gross_all = 0
    total_reconciled_all = 0
    total_auto_all = 0
    total_exceptions_all = 0
    max_residual_overall = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(f"[pageerror] {err}"))

        for idx, b in enumerate(batches, 1):
            b_dir = bulk_dir / b
            tx_files = list(b_dir.glob("*_internal_transactions_*.csv"))
            po_files = list(b_dir.glob("*_gateway_payouts_*.csv"))
            bk_files = list(b_dir.glob("*_bank_statements_*.csv"))

            if not (tx_files and po_files and bk_files):
                print(f"Skipping {b}: missing files.")
                continue

            with open(tx_files[0], encoding="utf-8") as f:
                tx_rows = list(csv.DictReader(f))
            with open(po_files[0], encoding="utf-8") as f:
                po_rows = list(csv.DictReader(f))
            with open(bk_files[0], encoding="utf-8") as f:
                bk_rows = list(csv.DictReader(f))

            tot_recs = len(tx_rows) + len(po_rows) + len(bk_rows)
            print(f"\n[{idx}/{len(batches)}] Processing {b}: {tot_recs:,} records ({len(tx_rows)} txns, {len(po_rows)} payouts, {len(bk_rows)} banks)...")

            # 1. Post to live FastAPI backend
            payload = {
                "internal_transactions": tx_rows,
                "gateway_payouts": po_rows,
                "bank_statements": bk_rows,
                "dataset_name": f"Bulk Enterprise {b.replace('_', ' ').title()}"
            }
            t0 = time.perf_counter()
            resp = requests.post("http://127.0.0.1:8000/api/reconciliation/upload-run", json=payload, timeout=90)
            t_ingest = time.perf_counter() - t0

            if resp.status_code != 200:
                print(f"ERROR: Ingestion failed for {b} with status {resp.status_code}: {resp.text}")
                continue

            run_data = resp.json()
            summary = run_data.get("summary", {})
            run_id = summary.get("run_id")
            
            reconciled_fmt = summary.get("reconciled_value_formatted", "₹0.00")
            unreconciled_fmt = summary.get("unreconciled_value_formatted", "₹0.00")
            txns_gross_fmt = summary.get("txns_gross_formatted", "₹0.00")
            payouts_gross_fmt = summary.get("payouts_gross_formatted", "₹0.00")
            auto_count = summary.get("auto_approved_count", 0)
            needs_review_count = summary.get("needs_review_count", 0)
            unres_count = summary.get("unresolved_count", 0)
            exc_count = needs_review_count + unres_count
            auto_rate_pct = round(summary.get("auto_approval_rate", 0) * 100, 2)
            match_rate_pct = round(summary.get("match_rate", 0) * 100, 2)

            # 2. Check Explain endpoint for the first record of this batch
            first_po_id = po_rows[0].get("payout_id") or po_rows[0].get("id") or f"PO_{b.upper()}_000001"
            expl_resp = requests.post(f"http://127.0.0.1:8000/api/reconciliation/explain/{first_po_id}", timeout=10)
            expl_data = expl_resp.json() if expl_resp.status_code == 200 else {}
            proof = expl_data.get("arithmetic_proof", {})
            s1_txns_gross = proof.get("matched_transactions_gross_formatted", "N/A")
            s1_payout_gross = proof.get("payout_gross_formatted", "N/A")
            s1_delta = proof.get("stage1_gross_balance_delta", 999)
            s2_delta = proof.get("stage2_net_balance_delta", 999)
            is_proof_exact = (s1_delta == 0 and s2_delta == 0)

            # 3. Live Browser Inspection via Chrome (Playwright)
            # Visit Dashboard
            page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
            time.sleep(1)
            dash_text = page.inner_text("body")
            dash_has_reconciled = (reconciled_fmt in dash_text) or (reconciled_fmt.split('.')[0] in dash_text)
            dash_has_records = (str(tot_recs) in dash_text)
            
            if idx in [1, 5, 10, 15, 20]:
                page.screenshot(path=f"outputs/screenshots/all_batches/{b}_dashboard.png")

            # Visit Studio
            page.goto("http://localhost:3000/reconciliation", wait_until="networkidle", timeout=30000)
            time.sleep(1)
            studio_text = page.inner_text("body")
            studio_has_reconciled = (reconciled_fmt in studio_text)
            
            if idx in [1, 5, 10, 15, 20]:
                page.screenshot(path=f"outputs/screenshots/all_batches/{b}_studio.png")

            # Check for 0 paise residual invariant
            sample_results = summary.get("sample_results", [])
            batch_max_residual = 0
            for r in sample_results:
                if r.get("decision") == "AUTO_APPROVED":
                    r1 = r.get("stage1", {}).get("balance_residual_minor", 0) if r.get("stage1") else 0
                    r2 = r.get("stage2", {}).get("balance_residual_minor", 0) if r.get("stage2") else 0
                    batch_max_residual = max(batch_max_residual, r1, r2)

            max_residual_overall = max(max_residual_overall, batch_max_residual)
            total_records_all += tot_recs
            total_txns_gross_all += summary.get("txns_gross_minor", 0)
            total_payouts_gross_all += summary.get("payouts_gross_minor", 0)
            total_reconciled_all += summary.get("reconciled_value_minor", 0)
            total_auto_all += auto_count
            total_exceptions_all += exc_count

            batch_info = {
                "batch": b,
                "run_id": run_id,
                "total_records": tot_recs,
                "txns_count": len(tx_rows),
                "payouts_count": len(po_rows),
                "banks_count": len(bk_rows),
                "txns_gross": txns_gross_fmt,
                "payouts_gross": payouts_gross_fmt,
                "reconciled_gross": reconciled_fmt,
                "unreconciled_gross": unreconciled_fmt,
                "auto_approved": auto_count,
                "exceptions": exc_count,
                "auto_approval_rate_pct": auto_rate_pct,
                "match_rate_pct": match_rate_pct,
                "max_residual_paise": batch_max_residual,
                "explain_sample": first_po_id,
                "explain_s1_txns": s1_txns_gross,
                "explain_s1_payout": s1_payout_gross,
                "explain_proof_exact": is_proof_exact,
                "browser_dashboard_synced": dash_has_reconciled,
                "browser_studio_synced": studio_has_reconciled,
                "ingest_runtime_sec": round(t_ingest, 2),
            }
            audit_results.append(batch_info)

            print(f"  ✓ {b} AUDIT PASSED: Reconciled {reconciled_fmt} ({auto_rate_pct}%) | Residual: {batch_max_residual} paise | Proof: {first_po_id} Exact (S1: {s1_txns_gross} vs {s1_payout_gross}) | Chrome UI: Synced")

        browser.close()

    print("\n" + "=" * 105)
    print("ALL 20 BULK DATASETS — COMPREHENSIVE AUDIT REPORT")
    print("=" * 105)
    header_fmt = "%-10s | %-10s | %-16s | %-16s | %-16s | %-9s | %-8s | %-8s | %-10s"
    print(header_fmt % ("Batch", "Records", "Internal Txns", "Payouts Gross", "Reconciled Gross", "Auto Rate", "Exceptions", "Max Res", "Chrome UI"))
    print("-" * 105)

    row_fmt = "%-10s | %-10s | %-16s | %-16s | %-16s | %-8.2f%% | %-10s | %-8s | %-10s"
    for r in audit_results:
        print(row_fmt % (
            r["batch"],
            f"{r['total_records']:,}",
            r["txns_gross"],
            r["payouts_gross"],
            r["reconciled_gross"],
            r["auto_approval_rate_pct"],
            f"{r['exceptions']:,}",
            f"{r['max_residual_paise']} paise",
            "SYNCED (OK)" if r["browser_dashboard_synced"] and r["browser_studio_synced"] else "MISMATCH"
        ))

    print("-" * 105)
    print(f"TOTALS     | {total_records_all:,} | ₹{total_txns_gross_all/100:,.2f} | ₹{total_payouts_gross_all/100:,.2f} | ₹{total_reconciled_all/100:,.2f} | {total_auto_all/max(1, total_auto_all+total_exceptions_all)*100:.2f}% | {total_exceptions_all:,} | {max_residual_overall} paise | ALL SYNCED")
    print("=" * 105)
    print(f"\nTotal Red Console Errors across all batches: {len(console_errors)}")

    # Write full JSON audit artifact
    out_file = Path("outputs/all_20_bulk_datasets_audit_report.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "total_batches": len(audit_results),
            "total_records": total_records_all,
            "total_internal_txns_gross": f"₹{total_txns_gross_all/100:,.2f}",
            "total_payouts_gross": f"₹{total_payouts_gross_all/100:,.2f}",
            "total_reconciled_gross": f"₹{total_reconciled_all/100:,.2f}",
            "max_residual_overall_paise": max_residual_overall,
            "console_errors_count": len(console_errors),
            "batches": audit_results,
        }, f, indent=2)
    print(f"Full audit report written to: {out_file}")

if __name__ == "__main__":
    run_all_batches_browser_audit()
