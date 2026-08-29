"""Normalization and reference tokenization module for Realm Verify."""
import re
from datetime import datetime, timezone
from typing import List, Set, Dict, Any, Tuple
from pydantic import ValidationError

from src.models import (
    InternalTransaction,
    GatewayPayout,
    BankStatementEntry,
    NormalizedRecord,
)


def extract_reference_tokens(text: str) -> List[str]:
    """Extract normalized alphanumeric tokens from reference or narration strings.
    
    Splits on non-alphanumeric characters, converts to lowercase,
    and discards single-character tokens.
    """
    if not text:
        return []
    # Replace common delimiters with spaces
    cleaned = re.sub(r"[^a-zA-Z0-9]", " ", text)
    tokens = [t.lower() for t in cleaned.split() if len(t) >= 2]
    # Remove generic banking stop words that could cause false token overlaps
    stop_words = {"cms", "neft", "rtgs", "upi", "cr", "dr", "settl", "inward", "transfer", "inr", "val", "rev"}
    return [t for t in tokens if t not in stop_words and len(t) >= 2]


def parse_timestamp_to_epoch(ts_str: str) -> int:
    """Parse ISO 8601 or Date timestamp string into UTC integer epoch seconds."""
    if not ts_str:
        return 1787270400  # Default epoch fallback
    
    # Handle YYYY-MM-DD
    if len(ts_str) == 10 and "-" in ts_str:
        ts_str = f"{ts_str}T00:00:00Z"

    # Strip trailing Z and parse
    ts_clean = ts_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(ts_clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except Exception:
        return 1787270400


class DataNormalizer:
    """Normalizes raw input records into validated schemas and structured tokens."""

    def __init__(self):
        self.malformed_records: List[Dict[str, Any]] = []

    def normalize_transactions(self, raw_txns: List[Dict[str, Any]]) -> List[NormalizedRecord]:
        """Validate and normalize internal transaction records with robust alias mapping."""
        normalized: List[NormalizedRecord] = []
        for raw in raw_txns:
            try:
                payload = dict(raw)
                # Require primary identifiers or aliases
                txn_id = payload.get("transaction_id") or payload.get("id") or payload.get("txn_id")
                cust_ref = payload.get("customer_reference") or payload.get("reference") or payload.get("order_id")
                
                gross_amt = payload.get("gross_amount_minor")
                if gross_amt is None:
                    gross_amt = payload.get("amount_minor", payload.get("amount"))

                created = payload.get("created_at") or payload.get("timestamp") or payload.get("date")

                if txn_id is None or cust_ref is None or gross_amt is None or created is None:
                    raise ValueError(f"Missing required transaction fields: id={txn_id}, ref={cust_ref}, gross={gross_amt}, created={created}")

                gross_amt = int(gross_amt)
                net_amt = payload.get("net_amount_minor")
                if net_amt is None:
                    fee = int(payload.get("fee_minor", payload.get("processing_fee_minor", 0)))
                    net_amt = gross_amt - fee
                net_amt = int(net_amt)

                curr = str(payload.get("currency", "INR")).upper()

                payload["transaction_id"] = str(txn_id)
                payload["customer_reference"] = str(cust_ref)
                payload["gross_amount_minor"] = gross_amt
                payload["net_amount_minor"] = net_amt
                payload["currency"] = curr
                payload["created_at"] = str(created)

                txn = InternalTransaction(**payload)
                epoch = parse_timestamp_to_epoch(txn.created_at)
                tokens = extract_reference_tokens(txn.customer_reference)
                
                normalized.append(NormalizedRecord(
                    record_id=txn.transaction_id,
                    source_type="TRANSACTION",
                    reference_tokens=tokens,
                    clean_reference=txn.customer_reference.strip(),
                    amount_minor=txn.gross_amount_minor,
                    currency=txn.currency.upper(),
                    timestamp_epoch=epoch,
                    raw_timestamp=txn.created_at,
                    raw_payload=txn.model_dump()
                ))
            except Exception as e:
                self.malformed_records.append({
                    "source_type": "TRANSACTION",
                    "raw_data": raw,
                    "error": str(e)
                })
        return normalized

    def normalize_payouts(self, raw_payouts: List[Dict[str, Any]]) -> List[NormalizedRecord]:
        """Validate and normalize gateway payout records with robust alias mapping."""
        normalized: List[NormalizedRecord] = []
        for raw in raw_payouts:
            try:
                payload = dict(raw)
                payout_id = payload.get("payout_id") or payload.get("id") or payload.get("settlement_id")
                gw_ref = payload.get("gateway_reference") or payload.get("reference") or payload.get("narration") or payout_id

                gross_amt = payload.get("gross_amount_minor")
                if gross_amt is None:
                    gross_amt = payload.get("amount_minor", payload.get("amount"))

                settled_at = payload.get("settlement_timestamp") or payload.get("timestamp") or payload.get("date")

                if payout_id is None or gross_amt is None or settled_at is None:
                    raise ValueError(f"Missing required payout fields: id={payout_id}, gross={gross_amt}, settled_at={settled_at}")

                gross_amt = int(gross_amt)
                fee_amt = int(payload.get("processing_fee_minor", payload.get("fee_minor", payload.get("fees", 0))))
                ref_amt = int(payload.get("refund_amount_minor", payload.get("refunds", 0)))
                cb_amt = int(payload.get("chargeback_amount_minor", payload.get("chargebacks", 0)))

                net_amt = payload.get("net_settlement_amount_minor")
                if net_amt is None:
                    net_amt = gross_amt - fee_amt - ref_amt - cb_amt
                net_amt = int(net_amt)

                curr = str(payload.get("currency", "INR")).upper()
                batch_tok = payload.get("batch_token") or payload.get("batch_id")

                payload["payout_id"] = str(payout_id)
                payload["gateway_reference"] = str(gw_ref)
                payload["gross_amount_minor"] = gross_amt
                payload["processing_fee_minor"] = fee_amt
                payload["refund_amount_minor"] = ref_amt
                payload["chargeback_amount_minor"] = cb_amt
                payload["net_settlement_amount_minor"] = net_amt
                payload["currency"] = curr
                payload["settlement_timestamp"] = str(settled_at)
                payload["batch_token"] = batch_tok

                payout = GatewayPayout(**payload)
                epoch = parse_timestamp_to_epoch(payout.settlement_timestamp)
                
                ref_text = f"{payout.gateway_reference} {payout.batch_token or ''}"
                tokens = extract_reference_tokens(ref_text)

                normalized.append(NormalizedRecord(
                    record_id=payout.payout_id,
                    source_type="PAYOUT",
                    reference_tokens=tokens,
                    clean_reference=payout.gateway_reference.strip(),
                    amount_minor=payout.gross_amount_minor,
                    currency=payout.currency.upper(),
                    timestamp_epoch=epoch,
                    raw_timestamp=payout.settlement_timestamp,
                    raw_payload=payout.model_dump()
                ))
            except Exception as e:
                self.malformed_records.append({
                    "source_type": "PAYOUT",
                    "raw_data": raw,
                    "error": str(e)
                })
        return normalized

    def normalize_bank_entries(self, raw_entries: List[Dict[str, Any]]) -> List[NormalizedRecord]:
        """Validate and normalize bank statement entries with robust alias mapping."""
        normalized: List[NormalizedRecord] = []
        for raw in raw_entries:
            try:
                payload = dict(raw)
                b_id = payload.get("bank_entry_id") or payload.get("entry_id") or payload.get("id")
                b_ref = payload.get("bank_reference") or payload.get("reference") or payload.get("utr") or b_id
                narration = payload.get("narration") or payload.get("bank_narration") or payload.get("description") or b_ref

                credit_amt = payload.get("credit_amount_minor")
                if credit_amt is None:
                    credit_amt = payload.get("amount_minor", payload.get("amount"))

                v_date = payload.get("value_date") or payload.get("date")
                settle_ts = payload.get("settlement_timestamp") or payload.get("timestamp") or v_date

                if b_id is None or credit_amt is None or (v_date is None and settle_ts is None):
                    raise ValueError(f"Missing required bank statement fields: id={b_id}, credit={credit_amt}, date={v_date}")

                credit_amt = int(credit_amt)
                debit_amt = int(payload.get("debit_amount_minor", 0))

                curr = str(payload.get("currency", "INR")).upper()
                v_date = str(v_date or "2026-08-21")
                settle_ts = str(settle_ts or f"{v_date}T06:00:00Z")
                if len(settle_ts) == 10:
                    settle_ts = f"{settle_ts}T06:00:00Z"

                payload["bank_entry_id"] = str(b_id)
                payload["bank_reference"] = str(b_ref)
                payload["narration"] = str(narration)
                payload["credit_amount_minor"] = credit_amt
                payload["debit_amount_minor"] = debit_amt
                payload["currency"] = curr
                payload["value_date"] = v_date
                payload["settlement_timestamp"] = settle_ts

                bank = BankStatementEntry(**payload)
                epoch = parse_timestamp_to_epoch(bank.settlement_timestamp)
                
                narration_text = f"{bank.bank_reference} {bank.narration}"
                tokens = extract_reference_tokens(narration_text)

                normalized.append(NormalizedRecord(
                    record_id=bank.bank_entry_id,
                    source_type="BANK_ENTRY",
                    reference_tokens=tokens,
                    clean_reference=bank.bank_reference.strip(),
                    amount_minor=bank.credit_amount_minor,
                    currency=bank.currency.upper(),
                    timestamp_epoch=epoch,
                    raw_timestamp=bank.settlement_timestamp,
                    raw_payload=bank.model_dump()
                ))
            except Exception as e:
                self.malformed_records.append({
                    "source_type": "BANK_ENTRY",
                    "raw_data": raw,
                    "error": str(e)
                })
        return normalized
