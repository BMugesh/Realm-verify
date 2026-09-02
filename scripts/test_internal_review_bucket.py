import json
import time
import requests
from playwright.sync_api import sync_playwright

def test_internal_anomaly_bucket():
    print("=" * 80)
    print("TESTING INTERNAL LEDGER ANOMALY DETECTION & BUCKET ROUTING")
    print("=" * 80)

    # 1. Dataset containing:
    # - 1 Auto-Approved transaction (INR 5,000.00 = 500,000 paise)
    # - 1 Internal Anomaly (Cross-currency USD transaction on internal ledger -> NEEDS_REVIEW, USD 3,000.00 = 300,000 paise)
    # - 1 External Gateway Orphan Payout (Missing internal order record -> UNRESOLVED, INR 1,500.00 = 150,000 paise)
    payload = {
        "dataset_name": "Internal Anomaly & External Gap Verification",
        "internal_transactions": [
            {
                "transaction_id": "TXN_INT_OK_01",
                "customer_reference": "REF_INT_OK_01",
                "order_id": "ORD_INT_OK_01",
                "gross_amount_minor": 500000,
                "net_amount_minor": 490000,
                "currency": "INR",
                "status": "SUCCESS",
                "created_at": "2026-08-01T10:00:00Z",
                "counterparty_name": "Acme Retail India"
            },
            {
                "transaction_id": "TXN_INT_REVIEW_01",
                "customer_reference": "REF_INT_REVIEW_01",
                "order_id": "ORD_INT_REVIEW_01",
                "gross_amount_minor": 300000,
                "net_amount_minor": 294000,
                "currency": "USD",  # Cross-currency triggers CURRENCY_POLICY_UNSUPPORTED -> NEEDS_REVIEW
                "status": "SUCCESS",
                "created_at": "2026-08-01T11:00:00Z",
                "counterparty_name": "Global Tech Corp USD"
            }
        ],
        "gateway_payouts": [
            {
                "payout_id": "PO_OK_01",
                "gateway_name": "Razorpay Route",
                "gateway_reference": "REF_INT_OK_01 PO_OK_01",
                "gross_amount_minor": 500000,
                "processing_fee_minor": 10000,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": 490000,
                "currency": "INR",
                "settlement_timestamp": "2026-08-01T10:05:00Z",
                "batch_token": "BATCH_OK_01"
            },
            {
                "payout_id": "PO_REVIEW_01",
                "gateway_name": "Stripe Global",
                "gateway_reference": "REF_INT_REVIEW_01 PO_REVIEW_01",
                "gross_amount_minor": 300000,
                "processing_fee_minor": 6000,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": 294000,
                "currency": "USD",  # Cross-currency USD
                "settlement_timestamp": "2026-08-01T11:05:00Z",
                "batch_token": "BATCH_REVIEW_01"
            },
            {
                "payout_id": "PO_ORPHAN_01",
                "gateway_name": "PayU Enterprise",
                "gateway_reference": "REF_MISSING_999 PO_ORPHAN_01",
                "gross_amount_minor": 150000,
                "processing_fee_minor": 3000,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": 147000,
                "currency": "INR",
                "settlement_timestamp": "2026-08-01T12:00:00Z",
                "batch_token": "BATCH_ORPHAN_01"
            }
        ],
        "bank_statements": [
            {
                "entry_id": "BNK_OK_01",
                "bank_name": "HDFC Bank",
                "account_number": "502000123456",
                "bank_narration": "CMS/CR/RAZORPAY/REF_INT_OK_01/NET",
                "credit_amount_minor": 490000,
                "debit_amount_minor": 0,
                "currency": "INR",
                "value_date": "2026-08-01",
                "settlement_timestamp": "2026-08-01T10:10:00Z"
            },
            {
                "entry_id": "BNK_REVIEW_01",
                "bank_name": "HDFC Bank",
                "account_number": "502000123456",
                "bank_narration": "CMS/CR/STRIPE/REF_INT_REVIEW_01/USD",
                "credit_amount_minor": 294000,
                "debit_amount_minor": 0,
                "currency": "USD",
                "value_date": "2026-08-01",
                "settlement_timestamp": "2026-08-01T11:10:00Z"
            }
        ]
    }

    # Ingest through live FastAPI backend
    resp = requests.post("http://127.0.0.1:8000/api/reconciliation/upload-run", json=payload)
    print(f"API Response Status: {resp.status_code}")
    data = resp.json()
    summary = data.get("summary", {})

    print("\n--- INGESTION SUMMARY ---")
    print(f"Total Source Records: {summary.get('total_source_records')}")
    print(f"Auto Approved:        {summary.get('auto_approved_count')} ({summary.get('reconciled_value_formatted')})")
    print(f"Needs Review (Int):   {summary.get('needs_review_count')}")
    print(f"Unresolved (Ext):     {summary.get('unresolved_count')}")
    print(f"Unreconciled Total:   {summary.get('unreconciled_value_formatted')}")

    for r in summary.get("sample_results", []):
        dec = r.get("decision")
        sid = r.get("settlement_id")
        reasons = r.get("failure_reasons", [])
        print(f"  • Settlement {sid}: {dec} (Reasons: {reasons})")

    # 2. Check in real Chrome browser via Playwright
    print("\n--- LAUNCHING REAL CHROME TO CHECK 'INTERNAL REVIEW' BUCKET ---")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://localhost:3000/reconciliation", wait_until="networkidle")
        time.sleep(2)
        
        screenshot_path = "outputs/screenshots/internal_review_bucket_proof.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Saved live screenshot: {screenshot_path}")

        # Extract text from the comparison cards
        body_text = page.inner_text("body")
        print("\n--- EXTRACTED METRICS FROM LIVE STUDIO DOM ---")
        for line in body_text.splitlines():
            l = line.strip()
            if any(k in l for k in ["Internal Review", "External Gateway", "Total Unsettled", "Review Count", "Gateway Count", "Match Consensus", "PO_REVIEW_01", "PO_OK_01", "PO_ORPHAN_01"]):
                print(f"  [DOM LINE]: {l}")

        browser.close()

if __name__ == "__main__":
    test_internal_anomaly_bucket()
