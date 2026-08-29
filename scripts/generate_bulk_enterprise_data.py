"""High-Performance Bulk Enterprise Dataset Generator for Realm Verify.

Generates realistic 3-ledger financial exports with 10,000+ records per batch:
1. Internal Transactions (Billing/ERP)
2. Gateway Payouts (Razorpay/Stripe/PayU/Cashfree)
3. Bank Statements (ICICI/HDFC/Axis/SBI/Kotak Nodal Accounts)
"""
import os
import csv
import random
import time
from pathlib import Path
from datetime import datetime, timedelta

COUNTERPARTIES = [
    ("Amazon Seller Services India", "AMZN"),
    ("Flipkart Internet Pvt Ltd", "FLPK"),
    ("Zomato Limited", "ZOMA"),
    ("Swiggy Bundl Technologies", "SWIG"),
    ("Blinkit Commerce Pvt Ltd", "BLNK"),
    ("Myntra Designs Pvt Ltd", "MYNT"),
    ("Tata Digital Private Limited", "TATA"),
    ("Reliance Retail / Jio Platforms", "JIOO"),
    ("Uber India Systems Pvt Ltd", "UBER"),
    ("Ola ANI Technologies", "OLAA"),
    ("Nykaa E-Retail Pvt Ltd", "NYKA"),
    ("BigBasket Supermarket Grocery", "BBAS"),
    ("MakeMyTrip India Pvt Ltd", "MMTR"),
    ("BookMyShow Bigtree Entertainment", "BKMS"),
    ("PhonePe Payment Services", "PHNP"),
    ("Paytm One97 Communications", "PAYT"),
]

BANKS = [
    ("HDFC Bank Ltd", "HDFC0000060", "50200088991234"),
    ("ICICI Bank Pvt Ltd", "ICIC0000104", "000405012345"),
    ("Axis Bank Limited", "UTIB0000028", "918020034567890"),
    ("State Bank of India", "SBIN0000691", "30987654321"),
    ("Kotak Mahindra Bank", "KKBK0000958", "882100456789"),
]

GATEWAYS = ["Razorpay Nodal", "Cashfree Escrow", "PayU Enterprise", "BillDesk Settlement", "Stripe India"]
PAYMENT_METHODS = ["UPI", "NetBanking", "CreditCard", "DebitCard", "NEFT", "RTGS"]


def generate_enterprise_batch(
    output_dir: Path,
    batch_index: int = 1,
    target_txns: int = 10000,
    seed: int = 42,
):
    """Generate a cohesive, realistic 10,000+ record financial dataset."""
    random.seed(seed + batch_index)
    output_dir.mkdir(parents=True, exist_ok=True)

    base_date = datetime(2026, 8, 1, 9, 0, 0) + timedelta(days=batch_index)

    txns_file = output_dir / f"batch_{batch_index:02d}_internal_transactions_{target_txns}.csv"
    pos_file = output_dir / f"batch_{batch_index:02d}_gateway_payouts_{target_txns}.csv"
    banks_file = output_dir / f"batch_{batch_index:02d}_bank_statements_{target_txns}.csv"

    txns = []
    payouts = []
    bank_entries = []

    txn_idx = 1
    po_idx = 1
    bnk_idx = 1

    while txn_idx <= target_txns:
        c_name, c_code = random.choice(COUNTERPARTIES)
        bank_name, ifsc, acc_no = random.choice(BANKS)
        gateway = random.choice(GATEWAYS)
        pm = random.choice(PAYMENT_METHODS)

        # Decide pattern: 1:1 match (70%), 2:1 batch (15%), 3:1 batch (10%), 1:Many split (3%), exception (2%)
        pattern_rand = random.random()
        
        if pattern_rand < 0.70:
            # 1:1 Match
            gross_paise = random.randint(25000, 450000)  # ₹250.00 to ₹4,500.00
            fee_paise = int(gross_paise * random.uniform(0.015, 0.025))  # 1.5% - 2.5% MDR
            net_paise = gross_paise - fee_paise

            ref_id = f"{c_code}-INV-{random.randint(100000, 999999)}"
            txn_id = f"TXN_B{batch_index:02d}_{txn_idx:06d}"
            po_id = f"PO_B{batch_index:02d}_{po_idx:06d}"
            bnk_id = f"BNK_B{batch_index:02d}_{bnk_idx:06d}"

            txn_time = base_date + timedelta(minutes=random.randint(1, 1440))
            po_time = txn_time + timedelta(hours=random.randint(4, 18))
            bnk_time = po_time + timedelta(hours=random.randint(2, 8))

            txns.append({
                "transaction_id": txn_id,
                "customer_reference": ref_id,
                "order_id": f"ORD-{ref_id}",
                "gross_amount_minor": gross_paise,
                "net_amount_minor": net_paise,
                "currency": "INR",
                "created_at": txn_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "counterparty_name": c_name,
                "payment_method": pm,
                "status": "SETTLED"
            })

            payouts.append({
                "payout_id": po_id,
                "gateway_name": gateway,
                "gateway_reference": f"{ref_id} {po_id}",
                "gross_amount_minor": gross_paise,
                "processing_fee_minor": fee_paise,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": net_paise,
                "currency": "INR",
                "settlement_timestamp": po_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "batch_token": f"BATCH-{c_code}-{po_idx:04d}"
            })

            bank_entries.append({
                "entry_id": bnk_id,
                "bank_name": bank_name,
                "account_number": acc_no,
                "bank_narration": f"CMS/CR/{gateway.split()[0].upper()}/{ref_id}/NET",
                "credit_amount_minor": net_paise,
                "debit_amount_minor": 0,
                "currency": "INR",
                "value_date": bnk_time.strftime("%Y-%m-%d"),
                "settlement_timestamp": bnk_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })

            txn_idx += 1
            po_idx += 1
            bnk_idx += 1

        elif pattern_rand < 0.95:
            # Multi-Transaction Batch Payout (2 or 3 items consolidated into 1 payout)
            batch_size = 2 if pattern_rand < 0.85 else 3
            batch_token = f"BATCH-{c_code}-{po_idx:04d}"
            batch_txns_gross = 0
            batch_refs = []
            po_id = f"PO_B{batch_index:02d}_{po_idx:06d}"
            bnk_id = f"BNK_B{batch_index:02d}_{bnk_idx:06d}"

            batch_base_time = base_date + timedelta(minutes=random.randint(1, 1440))

            for b_i in range(batch_size):
                if txn_idx > target_txns:
                    break
                t_gross = random.randint(15000, 250000)
                t_fee = int(t_gross * 0.02)
                t_ref = f"{c_code}-ORD-{random.randint(100000, 999999)}"
                t_id = f"TXN_B{batch_index:02d}_{txn_idx:06d}"
                batch_txns_gross += t_gross
                batch_refs.append(t_ref)

                txns.append({
                    "transaction_id": t_id,
                    "customer_reference": t_ref,
                    "order_id": f"ORD-{t_ref}",
                    "gross_amount_minor": t_gross,
                    "net_amount_minor": t_gross - t_fee,
                    "currency": "INR",
                    "created_at": (batch_base_time + timedelta(minutes=b_i * 15)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "counterparty_name": c_name,
                    "payment_method": pm,
                    "status": "SETTLED"
                })
                txn_idx += 1

            po_fee = int(batch_txns_gross * 0.02)
            po_net = batch_txns_gross - po_fee
            po_time = batch_base_time + timedelta(hours=12)
            bnk_time = po_time + timedelta(hours=4)

            payouts.append({
                "payout_id": po_id,
                "gateway_name": gateway,
                "gateway_reference": f"{' '.join(batch_refs)} {batch_token}",
                "gross_amount_minor": batch_txns_gross,
                "processing_fee_minor": po_fee,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": po_net,
                "currency": "INR",
                "settlement_timestamp": po_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "batch_token": batch_token
            })

            bank_entries.append({
                "entry_id": bnk_id,
                "bank_name": bank_name,
                "account_number": acc_no,
                "bank_narration": f"CMS/CR/{gateway.split()[0].upper()}/{batch_token}/NODAL",
                "credit_amount_minor": po_net,
                "debit_amount_minor": 0,
                "currency": "INR",
                "value_date": bnk_time.strftime("%Y-%m-%d"),
                "settlement_timestamp": bnk_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })

            po_idx += 1
            bnk_idx += 1

        else:
            # Controlled Anomaly / Review Record (e.g. Near-amount skew or unlinked holdout)
            gross_paise = random.randint(50000, 300000)
            fee_paise = int(gross_paise * 0.02)
            net_paise = gross_paise - fee_paise

            ref_id = f"{c_code}-EXC-{random.randint(100000, 999999)}"
            txn_id = f"TXN_B{batch_index:02d}_{txn_idx:06d}"
            po_id = f"PO_B{batch_index:02d}_{po_idx:06d}"

            txn_time = base_date + timedelta(minutes=random.randint(1, 1440))
            po_time = txn_time + timedelta(hours=24)

            txns.append({
                "transaction_id": txn_id,
                "customer_reference": ref_id,
                "order_id": f"ORD-{ref_id}",
                "gross_amount_minor": gross_paise,
                "net_amount_minor": net_paise,
                "currency": "INR",
                "created_at": txn_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "counterparty_name": c_name,
                "payment_method": pm,
                "status": "PENDING"
            })

            payouts.append({
                "payout_id": po_id,
                "gateway_name": gateway,
                "gateway_reference": f"{ref_id}-UNRESOLVED",
                "gross_amount_minor": gross_paise + 500,  # 500 paise intentional variance
                "processing_fee_minor": fee_paise,
                "refund_amount_minor": 0,
                "chargeback_amount_minor": 0,
                "net_settlement_amount_minor": net_paise + 500,
                "currency": "INR",
                "settlement_timestamp": po_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "batch_token": "HOLD-ESCROW"
            })

            txn_idx += 1
            po_idx += 1

    # Write CSV files with standard headers
    with open(txns_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["transaction_id", "customer_reference", "order_id", "gross_amount_minor", "net_amount_minor", "currency", "created_at", "counterparty_name", "payment_method", "status"])
        writer.writeheader()
        writer.writerows(txns)

    with open(pos_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["payout_id", "gateway_name", "gateway_reference", "gross_amount_minor", "processing_fee_minor", "refund_amount_minor", "chargeback_amount_minor", "net_settlement_amount_minor", "currency", "settlement_timestamp", "batch_token"])
        writer.writeheader()
        writer.writerows(payouts)

    with open(banks_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["entry_id", "bank_name", "account_number", "bank_narration", "credit_amount_minor", "debit_amount_minor", "currency", "value_date", "settlement_timestamp"])
        writer.writeheader()
        writer.writerows(bank_entries)

    return {
        "batch_index": batch_index,
        "txns_count": len(txns),
        "payouts_count": len(payouts),
        "banks_count": len(bank_entries),
        "total_records": len(txns) + len(payouts) + len(bank_entries),
        "txns_file": str(txns_file),
        "pos_file": str(pos_file),
        "banks_file": str(banks_file),
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Bulk Financial Dataset Generator for Realm Verify")
    parser.add_argument("--batches", type=int, default=10, help="Number of batches to generate (e.g. 10, 20, 50)")
    parser.add_argument("--size", type=int, default=10000, help="Target transactions per batch (e.g. 10000)")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent.parent / "data" / "bulk_datasets"
    print(f"[*] Generating {args.batches} Bulk Enterprise Batches ({args.size:,} txns each) in: {base_dir}")
    t0 = time.time()

    for b_idx in range(1, args.batches + 1):
        info = generate_enterprise_batch(
            output_dir=base_dir / f"batch_{b_idx:02d}",
            batch_index=b_idx,
            target_txns=args.size,
            seed=100 + b_idx,
        )
        print(f" [+] Batch {b_idx:02d} Complete: {info['txns_count']:,} Txns, {info['payouts_count']:,} Payouts, {info['banks_count']:,} Bank Entries (Total: {info['total_records']:,} rows)")

    # Also generate a consolidated Master 10,000 file in root of bulk_datasets
    generate_enterprise_batch(
        output_dir=base_dir,
        batch_index=1,
        target_txns=args.size,
        seed=777,
    )
    print(f"[*] Master {args.size:,} Record Export Created in root bulk_datasets/")
    print(f"[✓] Successfully generated {args.batches} batches in {time.time() - t0:.2f}s!")


if __name__ == "__main__":
    main()
