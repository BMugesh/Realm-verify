# Realm Verify — Dataset Schema & Anomaly Distribution

## 1. Input Schemas

All financial monetary fields are stored as **integer minor units (paise)**.

### 1.1 Internal Core Ledger (`internal_ledger.json`)
```json
{
  "transaction_id": "TXN_1001",
  "customer_reference": "AMZN-INV-882194",
  "gross_amount_minor": 10050,
  "net_amount_minor": 10050,
  "currency": "INR",
  "created_at": "2026-03-01T10:00:00+00:00",
  "payment_status": "captured"
}
```

### 1.2 Gateway Payout Report (`gateway_payouts.csv`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `payout_id` | string | Unique gateway payout ID (e.g. `PO_2001`) |
| `gateway_reference` | string | Gateway reference token (e.g. `RZP-PO-882194`) |
| `gross_amount_minor` | integer | Gross payout amount in paise |
| `processing_fee_minor` | integer | Processing fee deduction in paise |
| `refund_amount_minor` | integer | Refund deduction in paise |
| `chargeback_amount_minor`| integer | Chargeback deduction in paise |
| `net_settlement_amount_minor`| integer | Net settlement amount in paise |
| `currency` | string | Settlement currency (`INR`) |
| `settlement_timestamp` | string | ISO 8601 UTC timestamp |
| `batch_token` | string | Consolidation/batch identifier |

### 1.3 Bank Statement Feed (`bank_statements.csv`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `bank_entry_id` | string | Bank statement entry ID (e.g. `BNK_3001`) |
| `bank_reference` | string | Bank reference (e.g. `CMS/HDFC/RZP-PO-882194`) |
| `narration` | string | Statement narration string |
| `credit_amount_minor` | integer | Credit amount in paise |
| `debit_amount_minor` | integer | Debit amount in paise |
| `currency` | string | Account currency (`INR`) |
| `value_date` | string | Value date (`YYYY-MM-DD`) |
| `settlement_timestamp` | string | ISO 8601 UTC timestamp |

---

## 2. Hidden Ground Truth Policy

Hidden ground truth (`hidden_ground_truth.json`) links `transaction_ids`, `payout_ids`, and `bank_entry_ids` under `canonical_settlement_group_id`.

> [!CAUTION]
> **Evaluator-Only Access:** Hidden ground truth is stored separately and is NEVER exposed to the candidate retrieval, matching, or validation pipeline.

---

## 3. Anomaly Categories & Controlled Distribution

| Anomaly Category | Target Distribution | Description | Expected Decision |
| :--- | :--- | :--- | :--- |
| `EXACT_MATCH_1TO1` | ~28% | 1:1 clean reference and exact amount | `AUTO_APPROVED` |
| `FEE_ADJUSTED_1TO1` | ~16% | Standard 1:1 with gateway MDR fee | `AUTO_APPROVED` |
| `MANY_TO_ONE_BATCH` | ~15% | 2 to 4 transactions consolidated into 1 payout gross | `AUTO_APPROVED` |
| `ONE_TO_MANY_SPLIT` | ~9% | 1 payout split into 2 bank credit instalments | `AUTO_APPROVED` |
| `DELAYED_SETTLEMENT` | ~8% | Settlement delay of 3 to 7 days | `AUTO_APPROVED` / `NEEDS_REVIEW` |
| `NOISY_REFERENCE` | ~7% | Masked/prefixed bank narration | `AUTO_APPROVED` / `NEEDS_REVIEW` |
| `PARTIAL_REFUND_REVERSAL`| ~4% | Payout adjusted with refund and chargeback deductions | `AUTO_APPROVED` |
| `DUPLICATE_NEAR_AMOUNT` | ~3% | Competing candidates with identical paise amounts | `AUTO_APPROVED` / `NEEDS_REVIEW` |
| `AMBIGUOUS_CANDIDATE` | ~2% | Multiple candidate matches requiring review | `NEEDS_REVIEW` |
| `MISSING_COUNTERPART` | ~3% | Orphan transaction or orphan payout | `UNRESOLVED` |
| `AMOUNT_MISMATCH` | ~2% | Corrupted bank amount (e.g. transposition error) | `UNRESOLVED` |
| `MALFORMED_RECORD` | ~1% | Internal equation violation in payout | `UNRESOLVED` |
| `CROSS_CURRENCY` | ~1% | USD/EUR transaction in INR account | `NEEDS_REVIEW` (`CURRENCY_POLICY_UNSUPPORTED`) |

---

## 4. Entity Counting & Entity Mapping (500 Transactions → 369 Settlement Groups)

A core question in multi-ledger reconciliation evaluation is how source records map to primary reconciliation units:

1. **Source Records Count (1,266 entities):**
   - **Internal Core Transactions:** 500 records (`TXN_1001` – `TXN_1500`)
   - **Gateway Payouts:** 369 records (`PO_2001` – `PO_2369`)
   - **Bank Statement Entries:** 397 records (`BNK_3001` – `BNK_3397`)
   - **Total Processed Input Records:** $500 + 369 + 397 = 1,266$ raw entries.

2. **Why 500 Transactions produce 369 Payout Settlement Units:**
   - In realistic gateway operations, payment gateways settle merchants in batches rather than 1:1 for every swipe.
   - ~15% of transactions are consolidated via `MANY_TO_ONE_BATCH` (bundling 2 to 4 transactions per single payout).
   - In addition, ~3% of transactions/payouts are generated as orphan `MISSING_COUNTERPART` entries.
   - *Note on early documentation drafts:* Early design notes approximated ~375 settlement entities based on a hypothetical $500 / 1.33$ estimate; the exact, deterministic seed generation (`Seed 42`) generates precisely **369 gateway payout settlement entities**, which form the primary decision units in the evidence ledger. Every number in the evaluator, API, and UI traces to these exact 369 settlement IDs.
