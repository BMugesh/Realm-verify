"""Synthetic dataset generator for Realm Verify.

Generates three noisy financial data sources:
1. Internal Core Ledger (JSON)
2. Gateway Payout Report (CSV)
3. Bank Statement Feed (CSV)
4. Hidden Ground Truth (JSON, separate from agent inputs)

All financial amounts are strictly integer minor units (paise).
"""
import argparse
import csv
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Tuple, Any

from src.models import (
    InternalTransaction,
    GatewayPayout,
    BankStatementEntry,
    GroundTruthGroup,
    DecisionStatus,
    format_inr,
)


class SyntheticDataGenerator:
    """Deterministic generator for multi-source reconciliation data with realistic anomalies."""

    def __init__(self, seed: int = 42, target_records: int = 500):
        self.seed = seed
        self.target_records = target_records
        self.rng = random.Random(seed)
        
        # Base timestamp for the synthetic dataset
        self.base_time = datetime(2026, 3, 1, 9, 0, 0, tzinfo=timezone.utc)
        
        # Running ID counters
        self.txn_counter = 1000
        self.payout_counter = 2000
        self.bank_counter = 3000
        self.group_counter = 1
        
        # Realistic merchant reference prefixes
        self.merchants = ["AMZN", "FLIP", "SWIG", "ZOMA", "UBER", "BLNK", "MYNT", "TATA", "RELI", "NYKA"]
        self.banks = ["HDFC", "ICIC", "SBIN", "UTIB", "KKBK", "YESB"]

    def _next_txn_id(self) -> str:
        self.txn_counter += 1
        return f"TXN_{self.txn_counter}"

    def _next_payout_id(self) -> str:
        self.payout_counter += 1
        return f"PO_{self.payout_counter}"

    def _next_bank_id(self) -> str:
        self.bank_counter += 1
        return f"BNK_{self.bank_counter}"

    def _next_group_id(self) -> str:
        gid = f"GRP_{self.group_counter:04d}"
        self.group_counter += 1
        return gid

    def generate(self) -> Tuple[List[InternalTransaction], List[GatewayPayout], List[BankStatementEntry], List[GroundTruthGroup]]:
        """Generate full synthetic dataset with controlled anomaly distribution."""
        txns: List[InternalTransaction] = []
        payouts: List[GatewayPayout] = []
        bank_entries: List[BankStatementEntry] = []
        ground_truth: List[GroundTruthGroup] = []

        # We generate settlement groups until we reach target_records count across transactions
        while len(txns) < self.target_records:
            anomaly_roll = self.rng.random()
            
            # Anomaly distribution selection
            if anomaly_roll < 0.28:
                cat = "EXACT_MATCH_1TO1"
            elif anomaly_roll < 0.44:
                cat = "FEE_ADJUSTED_1TO1"
            elif anomaly_roll < 0.58:
                cat = "MANY_TO_ONE_BATCH"
            elif anomaly_roll < 0.66:
                cat = "ONE_TO_MANY_SPLIT"
            elif anomaly_roll < 0.73:
                cat = "NOISY_REFERENCE"
            elif anomaly_roll < 0.80:
                cat = "DELAYED_SETTLEMENT"
            elif anomaly_roll < 0.85:
                cat = "PARTIAL_REFUND_REVERSAL"
            elif anomaly_roll < 0.89:
                cat = "DUPLICATE_NEAR_AMOUNT"
            elif anomaly_roll < 0.93:
                cat = "AMBIGUOUS_CANDIDATE"
            elif anomaly_roll < 0.96:
                cat = "MISSING_COUNTERPART"
            elif anomaly_roll < 0.98:
                cat = "AMOUNT_MISMATCH"
            elif anomaly_roll < 0.99:
                cat = "CROSS_CURRENCY"
            else:
                cat = "MALFORMED_RECORD"

            group_txns, group_pos, group_banks, gt = self._generate_group(cat)
            txns.extend(group_txns)
            payouts.extend(group_pos)
            bank_entries.extend(group_banks)
            ground_truth.append(gt)

        # Shuffle each source list to simulate real-world un-ordered ingestion
        self.rng.shuffle(txns)
        self.rng.shuffle(payouts)
        self.rng.shuffle(bank_entries)

        return txns, payouts, bank_entries, ground_truth

    def _generate_group(self, category: str) -> Tuple[List[InternalTransaction], List[GatewayPayout], List[BankStatementEntry], GroundTruthGroup]:
        """Generate a single settlement group based on the specified anomaly category."""
        grp_id = self._next_group_id()
        merchant = self.rng.choice(self.merchants)
        bank_code = self.rng.choice(self.banks)
        
        # Base time with random offset
        day_offset = self.rng.randint(0, 20)
        hour_offset = self.rng.randint(0, 23)
        min_offset = self.rng.randint(0, 59)
        t_create = self.base_time + timedelta(days=day_offset, hours=hour_offset, minutes=min_offset)
        
        # Standard clean reference token
        ref_num = self.rng.randint(100000, 999999)
        clean_ref = f"{merchant}-INV-{ref_num}"
        
        # Base transaction amount: INR 50.00 to INR 50,000.00 (5,000 to 5,000,000 paise)
        base_amount_paise = self.rng.randint(500, 25000) * 10

        txns: List[InternalTransaction] = []
        payouts: List[GatewayPayout] = []
        bank_entries: List[BankStatementEntry] = []
        expected_status = DecisionStatus.AUTO_APPROVED
        notes = f"Category: {category}"

        if category == "EXACT_MATCH_1TO1":
            # 1:1 clean match, zero fee
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            t_payout = t_create + timedelta(hours=self.rng.randint(2, 24))
            t_bank = t_payout + timedelta(hours=self.rng.randint(1, 12))
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=base_amount_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-PO-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=0,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=base_amount_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"BATCH-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"CMS/{bank_code}/RZP-PO-{ref_num}",
                narration=f"CMS/RZP-PO-{ref_num}/{merchant}",
                credit_amount_minor=base_amount_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "FEE_ADJUSTED_1TO1":
            # 1:1 match with standard 2% + 18% GST fee (2.36%) or fixed fee
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            fee_paise = max(100, int(base_amount_paise * 0.0236))  # 2.36% fee
            net_paise = base_amount_paise - fee_paise
            
            t_payout = t_create + timedelta(hours=self.rng.randint(4, 24))
            t_bank = t_payout + timedelta(hours=self.rng.randint(2, 12))
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=net_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-PO-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=fee_paise,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=net_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"BATCH-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"CMS/{bank_code}/RZP-PO-{ref_num}",
                narration=f"NEFT/RZP-PO-{ref_num}/SETTL/{merchant}",
                credit_amount_minor=net_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "MANY_TO_ONE_BATCH":
            # 2 to 4 transactions consolidated into 1 gateway payout
            batch_count = self.rng.randint(2, 4)
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            batch_token = f"BATCH-CONSOL-{ref_num}"
            
            total_gross = 0
            total_net = 0
            t_ids = []
            
            t_payout = t_create + timedelta(hours=self.rng.randint(12, 36))
            
            for i in range(batch_count):
                t_id = self._next_txn_id()
                t_ids.append(t_id)
                t_amt = self.rng.randint(300, 15000) * 10
                t_fee = int(t_amt * 0.02)
                t_net = t_amt - t_fee
                total_gross += t_amt
                total_net += t_net
                
                t_time = t_create + timedelta(hours=i * 2, minutes=self.rng.randint(0, 45))
                txns.append(InternalTransaction(
                    transaction_id=t_id,
                    customer_reference=f"{merchant}-BAT-{ref_num}-{i+1}",
                    gross_amount_minor=t_amt,
                    net_amount_minor=t_net,
                    currency="INR",
                    created_at=t_time.isoformat(),
                    payment_status="captured"
                ))
            
            payout_fee = total_gross - total_net
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-BATCH-{ref_num}",
                gross_amount_minor=total_gross,
                processing_fee_minor=payout_fee,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=total_net,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=batch_token
            ))
            
            t_bank = t_payout + timedelta(hours=self.rng.randint(2, 10))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"RTGS/{bank_code}/RZP-BATCH-{ref_num}",
                narration=f"RTGS/RZP-BATCH-{ref_num}/MERCHANT-SETTLE",
                credit_amount_minor=total_net,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "ONE_TO_MANY_SPLIT":
            # 1 payout split across 2 bank credit instalments (e.g. intraday split settlement)
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            
            fee_paise = int(base_amount_paise * 0.02)
            net_paise = base_amount_paise - fee_paise
            
            # Split net into two halves
            split_1 = net_paise // 2
            split_2 = net_paise - split_1
            
            b_id1 = self._next_bank_id()
            b_id2 = self._next_bank_id()
            
            t_payout = t_create + timedelta(hours=12)
            t_bank1 = t_payout + timedelta(hours=2)
            t_bank2 = t_payout + timedelta(hours=6)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=net_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-SPLIT-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=fee_paise,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=net_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"SPLIT-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id1,
                bank_reference=f"NEFT/{bank_code}/RZP-SPLIT-{ref_num}/PART1",
                narration=f"NEFT/RZP-SPLIT-{ref_num}/PART1/{merchant}",
                credit_amount_minor=split_1,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank1.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank1.isoformat()
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id2,
                bank_reference=f"NEFT/{bank_code}/RZP-SPLIT-{ref_num}/PART2",
                narration=f"NEFT/RZP-SPLIT-{ref_num}/PART2/{merchant}",
                credit_amount_minor=split_2,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank2.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank2.isoformat()
            ))

        elif category == "NOISY_REFERENCE":
            # Truncated or prefixed noisy bank narrations
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            fee_paise = int(base_amount_paise * 0.02)
            net_paise = base_amount_paise - fee_paise
            t_payout = t_create + timedelta(hours=10)
            t_bank = t_payout + timedelta(hours=4)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=net_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-NOISY-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=fee_paise,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=net_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"NOISE-{ref_num}"
            ))
            # Noisy narration with masking and truncated token
            ref_str = str(ref_num)
            noisy_narration = f"UPI/CR/{ref_str[:4]}**/{merchant}PAY/0039482710/RZPNOISY{ref_str}"
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"UPI/{ref_str[:4]}**/{bank_code}",
                narration=noisy_narration,
                credit_amount_minor=net_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "DELAYED_SETTLEMENT":
            # Delayed settlement: 4 to 6 days
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            t_payout = t_create + timedelta(days=4, hours=3)
            t_bank = t_payout + timedelta(days=1, hours=2)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=base_amount_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-DELAY-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=0,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=base_amount_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"DELAY-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"NEFT/{bank_code}/RZP-DELAY-{ref_num}",
                narration=f"NEFT/RZP-DELAY-{ref_num}/{merchant}",
                credit_amount_minor=base_amount_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "PARTIAL_REFUND_REVERSAL":
            # Payout with processing fee, refund, and chargeback deductions
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            fee_paise = int(base_amount_paise * 0.02)
            refund_paise = max(100, int(base_amount_paise * 0.15))
            chargeback_paise = max(50, int(base_amount_paise * 0.05))
            net_paise = base_amount_paise - fee_paise - refund_paise - chargeback_paise
            
            t_payout = t_create + timedelta(hours=18)
            t_bank = t_payout + timedelta(hours=6)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=net_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-REV-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=fee_paise,
                refund_amount_minor=refund_paise,
                chargeback_amount_minor=chargeback_paise,
                net_settlement_amount_minor=net_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"REV-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"CMS/{bank_code}/RZP-REV-{ref_num}",
                narration=f"CMS/RZP-REV-{ref_num}/ADJUSTED/{merchant}",
                credit_amount_minor=net_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "DUPLICATE_NEAR_AMOUNT":
            # Two duplicate amounts on same date requiring reference disambiguation
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            t_payout = t_create + timedelta(hours=6)
            t_bank = t_payout + timedelta(hours=3)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=f"{merchant}-DUP-{ref_num}",
                gross_amount_minor=base_amount_paise,
                net_amount_minor=base_amount_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-DUP-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=0,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=base_amount_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"DUP-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"CMS/{bank_code}/RZP-DUP-{ref_num}",
                narration=f"CMS/RZP-DUP-{ref_num}/{merchant}",
                credit_amount_minor=base_amount_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))

        elif category == "AMBIGUOUS_CANDIDATE":
            # Competing candidate with minimal reference clues; expected status NEEDS_REVIEW if confidence margin is narrow
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            t_payout = t_create + timedelta(hours=8)
            t_bank = t_payout + timedelta(hours=4)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=f"AMBIG-{ref_num}",
                gross_amount_minor=base_amount_paise,
                net_amount_minor=base_amount_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"AMBIG-PO-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=0,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=base_amount_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=None
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"GENERIC/SETTLE/{bank_code}",
                narration=f"GENERIC SETTLEMENT CREDIT {ref_num}",
                credit_amount_minor=base_amount_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))
            expected_status = DecisionStatus.NEEDS_REVIEW

        elif category == "MISSING_COUNTERPART":
            # Orphan internal transaction without gateway settlement, or orphan payout without bank entry
            orphan_type = self.rng.choice(["ORPHAN_TXN", "ORPHAN_PAYOUT"])
            if orphan_type == "ORPHAN_TXN":
                t_id = self._next_txn_id()
                txns.append(InternalTransaction(
                    transaction_id=t_id,
                    customer_reference=f"{merchant}-ORPHAN-{ref_num}",
                    gross_amount_minor=base_amount_paise,
                    net_amount_minor=base_amount_paise,
                    currency="INR",
                    created_at=t_create.isoformat(),
                    payment_status="captured"
                ))
                notes = "Orphan transaction with no gateway settlement"
            else:
                p_id = self._next_payout_id()
                payouts.append(GatewayPayout(
                    payout_id=p_id,
                    gateway_reference=f"RZP-ORPHAN-{ref_num}",
                    gross_amount_minor=base_amount_paise,
                    processing_fee_minor=0,
                    refund_amount_minor=0,
                    chargeback_amount_minor=0,
                    net_settlement_amount_minor=base_amount_paise,
                    currency="INR",
                    settlement_timestamp=t_create.isoformat(),
                    batch_token=f"ORPHAN-{ref_num}"
                ))
                notes = "Orphan payout with no bank credit entry"
            expected_status = DecisionStatus.UNRESOLVED

        elif category == "AMOUNT_MISMATCH":
            # Corrupted amount in bank entry (e.g. 500 paise difference)
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            corrupted_bank_amt = base_amount_paise + 500  # Discrepancy of Rs 5.00
            t_payout = t_create + timedelta(hours=6)
            t_bank = t_payout + timedelta(hours=3)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=base_amount_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-ERR-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=0,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=base_amount_paise,
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"ERR-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"CMS/{bank_code}/RZP-ERR-{ref_num}",
                narration=f"CMS/RZP-ERR-{ref_num}/{merchant}",
                credit_amount_minor=corrupted_bank_amt,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))
            expected_status = DecisionStatus.UNRESOLVED
            notes = "Amount mismatch between payout and bank entry"

        elif category == "CROSS_CURRENCY":
            # USD transaction - policy routes to NEEDS_REVIEW
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            usd_cents = 2500  # $25.00
            t_payout = t_create + timedelta(hours=12)
            t_bank = t_payout + timedelta(hours=6)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=f"USD-REF-{ref_num}",
                gross_amount_minor=usd_cents,
                net_amount_minor=usd_cents,
                currency="USD",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-USD-{ref_num}",
                gross_amount_minor=usd_cents,
                processing_fee_minor=0,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=usd_cents,
                currency="USD",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"USD-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"WIRE/USD/{ref_num}",
                narration=f"INCOMING WIRE USD {ref_num}",
                credit_amount_minor=usd_cents,
                debit_amount_minor=0,
                currency="USD",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))
            expected_status = DecisionStatus.NEEDS_REVIEW
            notes = "Cross-currency USD transaction requiring review"

        elif category == "MALFORMED_RECORD":
            # Corrupted internal equation in gateway payout (gross - fees != net)
            t_id = self._next_txn_id()
            p_id = self._next_payout_id()
            b_id = self._next_bank_id()
            
            t_payout = t_create + timedelta(hours=6)
            t_bank = t_payout + timedelta(hours=3)
            
            txns.append(InternalTransaction(
                transaction_id=t_id,
                customer_reference=clean_ref,
                gross_amount_minor=base_amount_paise,
                net_amount_minor=base_amount_paise,
                currency="INR",
                created_at=t_create.isoformat(),
                payment_status="captured"
            ))
            # Malformed payout: fee is recorded as 500, but net is not deducted
            payouts.append(GatewayPayout(
                payout_id=p_id,
                gateway_reference=f"RZP-MAL-{ref_num}",
                gross_amount_minor=base_amount_paise,
                processing_fee_minor=500,
                refund_amount_minor=0,
                chargeback_amount_minor=0,
                net_settlement_amount_minor=base_amount_paise,  # Violates gross - fee == net
                currency="INR",
                settlement_timestamp=t_payout.isoformat(),
                batch_token=f"MAL-{ref_num}"
            ))
            bank_entries.append(BankStatementEntry(
                bank_entry_id=b_id,
                bank_reference=f"CMS/{bank_code}/RZP-MAL-{ref_num}",
                narration=f"CMS/RZP-MAL-{ref_num}/{merchant}",
                credit_amount_minor=base_amount_paise,
                debit_amount_minor=0,
                currency="INR",
                value_date=t_bank.strftime("%Y-%m-%d"),
                settlement_timestamp=t_bank.isoformat()
            ))
            expected_status = DecisionStatus.UNRESOLVED
            notes = "Malformed payout balance equation (gross - fee != net)"

        gt = GroundTruthGroup(
            canonical_settlement_group_id=grp_id,
            transaction_ids=[t.transaction_id for t in txns],
            payout_ids=[p.payout_id for p in payouts],
            bank_entry_ids=[b.bank_entry_id for b in bank_entries],
            anomaly_category=category,
            expected_status=expected_status,
            notes=notes
        )

        return txns, payouts, bank_entries, gt


def save_dataset(
    txns: List[InternalTransaction],
    payouts: List[GatewayPayout],
    bank_entries: List[BankStatementEntry],
    ground_truth: List[GroundTruthGroup],
    output_dir: Path
) -> None:
    """Save dataset files into output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Save internal ledger JSON
    ledger_path = output_dir / "internal_ledger.json"
    with open(ledger_path, "w", encoding="utf-8") as f:
        json.dump([t.model_dump() for t in txns], f, indent=2)

    # 2. Save gateway payouts CSV
    payouts_path = output_dir / "gateway_payouts.csv"
    with open(payouts_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "payout_id", "gateway_reference", "gross_amount_minor", "processing_fee_minor",
            "refund_amount_minor", "chargeback_amount_minor", "net_settlement_amount_minor",
            "currency", "settlement_timestamp", "batch_token"
        ])
        writer.writeheader()
        for p in payouts:
            writer.writerow(p.model_dump())

    # 3. Save bank statements CSV
    bank_path = output_dir / "bank_statements.csv"
    with open(bank_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "bank_entry_id", "bank_reference", "narration", "credit_amount_minor",
            "debit_amount_minor", "currency", "value_date", "settlement_timestamp"
        ])
        writer.writeheader()
        for b in bank_entries:
            writer.writerow(b.model_dump())

    # 4. Save hidden ground truth JSON (NEVER exposed to agent inputs)
    gt_path = output_dir / "hidden_ground_truth.json"
    with open(gt_path, "w", encoding="utf-8") as f:
        json.dump([g.model_dump() for g in ground_truth], f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic reconciliation data.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--records", type=int, default=500, help="Target transaction count")
    parser.add_argument("--output-dir", type=str, default="data/generated", help="Output directory")
    args = parser.parse_args()

    generator = SyntheticDataGenerator(seed=args.seed, target_records=args.records)
    txns, payouts, bank_entries, ground_truth = generator.generate()

    out_path = Path(args.output_dir)
    save_dataset(txns, payouts, bank_entries, ground_truth, out_path)

    # Compute anomaly category breakdown
    cat_counts: Dict[str, int] = {}
    for g in ground_truth:
        cat_counts[g.anomaly_category] = cat_counts.get(g.anomaly_category, 0) + 1

    total_gross_paise = sum(t.gross_amount_minor for t in txns)
    total_bank_paise = sum(b.credit_amount_minor for b in bank_entries)

    print(f"=== Synthetic Dataset Generated Successfully ===")
    print(f"Random Seed:           {args.seed}")
    print(f"Internal Transactions: {len(txns)} records ({format_inr(total_gross_paise)})")
    print(f"Gateway Payouts:       {len(payouts)} records")
    print(f"Bank Statement Entries:{len(bank_entries)} records ({format_inr(total_bank_paise)})")
    print(f"Settlement Groups:     {len(ground_truth)} canonical groups")
    print(f"\nAnomaly Distribution ({len(ground_truth)} total groups):")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        pct = (count / len(ground_truth)) * 100
        print(f"  - {cat:<26}: {count:>3} groups ({pct:>5.1f}%)")
    print(f"\nSaved Files to: {out_path.absolute()}")
    print(f"  - {out_path / 'internal_ledger.json'}")
    print(f"  - {out_path / 'gateway_payouts.csv'}")
    print(f"  - {out_path / 'bank_statements.csv'}")
    print(f"  - {out_path / 'hidden_ground_truth.json'} (HIDDEN GROUND TRUTH)")


if __name__ == "__main__":
    main()
