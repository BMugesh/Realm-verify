# Realm Verify — Evidence-Bound Multi-Ledger Reconciliation

**Submission for Razorpay AI Buildathon 2026 — AI Finance Controller Track**  
*A tested, end-to-end prototype for evidence-bound, two-stage reconciliation over synthetic data.*

🌐 **Live Web Application:** [realmverify.netlify.app](https://realmverify.netlify.app/)  
📖 **Deployment Guide:** [`DEPLOYMENT.md`](DEPLOYMENT.md)

---

## 1. Executive Summary & Core Thesis

> **Core Thesis:** *Verification capacity—not generation speed—is the bottleneck in finance operations. AI may interpret messy operational evidence, but it must never commit a financial decision unless deterministic accounting constraints validate it.*

Realm Verify is a tested prototype for evidence-bound, two-stage reconciliation across synthetic internal-ledger, gateway-payout, and bank-statement data. It links transactions to payouts and payouts to bank credits using integer paise arithmetic, deterministic validation, auditable exception routing, and an append-only evidence ledger. Across three fixed synthetic seeds, it improved end-to-end reconciliation F1 over an exact-match baseline while producing no auto-approved decisions that violated implemented hard accounting constraints.

---

## 2. Pipeline Architecture

```mermaid
flowchart TD
    subgraph Ingestion["1. Multi-Source Ingestion"]
        IL[Internal Core Ledger<br/>JSON]
        GP[Gateway Payout Report<br/>CSV]
        BS[Bank Statement Feed<br/>CSV / MT940-style]
    end

    subgraph Normalization["2. Schema & Reference Normalization"]
        NORM[Data Normalizer<br/>• Integer Minor Units (Paise)<br/>• Reference Tokenization<br/>• UTC Epoch Parsing]
    end

    subgraph Matching["3. Constrained Candidate Linkage"]
        STAGE1[Stage 1: Txn → Payout<br/>• Bipartite Assignment<br/>• Bounded Subset-Sum Search]
        STAGE2[Stage 2: Payout → Bank<br/>• Bipartite Assignment<br/>• Split-Settlement Search]
        LLM[Optional LLM Re-Ranker<br/>• Ambiguous Clusters Only<br/>• Strict Pydantic JSON Schema]
    end

    subgraph Validator["4. Deterministic Accounting Validator"]
        V_EQ[Payout Internal Balance<br/>gross - fees - refunds == net]
        V_S1[Stage 1 Batch Gross<br/>sum(txns) == payout gross]
        V_S2[Stage 2 Bank Net<br/>sum(banks) == payout net]
        V_POL[Currency & Date Window Policies]
    end

    subgraph Decisions["5. Decision Routing & Evidence"]
        AUTO[AUTO_APPROVED<br/>Passed all constraints & high confidence]
        REVIEW[NEEDS_REVIEW<br/>Ambiguous / Policy flagged]
        UNRES[UNRESOLVED<br/>Inconsistent / Orphan / Malformed]
        EVIDENCE[Append-Only SQLite Ledger<br/>SHA-256 Hash Chaining]
    end

    IL & GP & BS --> NORM
    NORM --> STAGE1 & STAGE2
    STAGE1 & STAGE2 --> LLM
    LLM --> V_EQ & V_S1 & V_S2 & V_POL
    V_EQ & V_S1 & V_S2 & V_POL --> AUTO & REVIEW & UNRES
    AUTO & REVIEW & UNRES --> EVIDENCE
```

---

## 3. Non-Negotiable Safety & Accounting Rules

1. **Integer Minor Units (Paise) Only:** Floating-point numbers are strictly forbidden in all financial balances, fees, deductions, and validation rules ($1 \text{ INR} = 100 \text{ paise}$).
2. **Deterministic Gating:** The LLM acts solely as an advisory re-ranker for residual ambiguous candidate clusters. It **never** commits a match, calculates amounts, or mutates ledger state.
3. **Hard Constraint Validation:** In the three evaluated synthetic runs, no auto-approved decision violated the implemented hard validation rules:
   - Payout balance equation: $\text{gross} - \text{fees} - \text{refunds} - \text{chargebacks} == \text{net\_settlement}$ ($0 \text{ paise}$ residual).
   - Stage 1 batch gross sum: $\sum \text{txn.gross} == \text{payout.gross}$ ($0 \text{ paise}$ residual).
   - Stage 2 bank net sum: $\sum \text{bank.credit} == \text{payout.net}$ ($0 \text{ paise}$ residual).
   - Date window validity: $\text{txn.created\_at} \le \text{payout.settlement\_timestamp} \le \text{bank.settlement\_timestamp} + \text{tolerance}$.
   - Uniqueness constraint: no double assignment of any record.
4. **Append-Only Evidence Ledger with SHA-256 Hash Chaining:** Every decision event links to the previous event block via SHA-256 hash chaining.
5. **Deterministic Replay in Pinned Environment:** Guaranteed exact decision ID and balance residual match on replay.

---

## 4. Scientific Framework: Separating Match Rate, Precision, and Auto-Approval Rate

| Metric | Scientific Definition | Operational Role in Finance Ops |
| :--- | :--- | :--- |
| **Match Rate** | $\frac{\text{Auto-Approved} + \text{Review with Candidate}}{\text{Total Settlement Entities}}$ | **Candidate Linkage Discovery:** Share of reconciliation entities for which the engine successfully identified candidate linkages across ledgers ($97.22\%$). |
| **  ├ Auto-Approval Rate** | $\frac{\text{Auto-Approved Settlement Entities}}{\text{Total Settlement Entities}}$ | **Straight-Through Processing:** Share of workload resolved automatically with zero manual touch ($73.56\%$). |
| **  └ Review Rate (Candidate Found)** | $\frac{\text{Needs Review with Candidate}}{\text{Total Settlement Entities}}$ | **Candidate Quarantine:** Discovered candidate linkages deferred for human review ($23.66\%$). |
| **Exception Rate** | $\frac{\text{Needs Review} + \text{Unresolved}}{\text{Total Entities}}$ | **Honest Escalation:** Total percentage safely quarantined for human review ($26.44\%$). |
| **  ├ Review Rate (Candidate Found)** | $\frac{\text{Needs Review with Candidate}}{\text{Total Entities}}$ | Ambiguous cluster, score margin, currency holdout, or date window skew ($23.66\%$). |
| **  └ Unresolved Rate (No Candidate)** | $\frac{\text{Unresolved Entities}}{\text{Total Entities}}$ | Missing counterpart, orphan record, or broken payout balance equation ($2.78\%$). |
| **Precision** | $\frac{\text{Correct Auto-Approved Matches}}{\text{Total Auto-Approved Matches}}$ | **Zero-Tolerance Safety:** Percentage of automated matches that are 100% correct in ground truth ($1.0000$ / $100\%$). |
| **Recall** | $\frac{\text{Ground-Truth Matches Identified}}{\text{Total Ground-Truth Matches}}$ | **Completeness:** Percentage of true reconcilable entities successfully recovered across noisy data ($59.38\%$). |
| **F1 Score** | $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$ | **Harmonic Mean:** Balanced metric of precision and recall ($0.7450$). |
| **Automation Coverage** | $\frac{\text{Autonomous Settlements}}{\text{Total Workload}}$ | **Workload Reduction:** Percentage of volume requiring zero analyst intervention ($73.56\%$). |
| **False-Match Rate** | $\frac{\text{Committed False Matches}}{\text{Total Auto-Approvals}}$ | **Treasury Risk:** $\mathbf{0.00\%}$ across all runs (0 committed errors). |
| **Committed Residual** | $\max |\text{sum(txns)} - \text{payout.gross}|$ | **Accounting Invariant:** $\mathbf{0\text{ paise}}$ on all auto-approved commitments. |

---

## 5. Measured Multi-Seed Benchmark Results (Seeds 42, 43, 44)

Evaluated across **3 independent random seeds** on multi-source datasets (500 internal transactions + 369 gateway payouts + 397 bank entries per seed, forming 369 primary settlement entities):

| Metric | Seed 42 | Seed 43 | Seed 44 | Mean ± Range across Seeds | Exact Baseline (Mean) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Match Rate (Candidates Found)** | `97.02%` | `96.78%` | `97.25%` | **`0.9702 ± 0.0023`** | `0.6778 ± 0.0203` |
| **  ├ Auto-Approval Rate** | `73.44%` | `73.01%` | `74.23%` | **`0.7356 ± 0.0061`** | `0.6778 ± 0.0203` |
| **  └ Review Rate (Candidate Found)** | `23.58%` | `23.77%` | `23.02%` | **`0.2346 ± 0.0038`** | `0.0000 ± 0.0000` |
| **Exception Rate (Total Quarantined)** | `26.56%` | `26.99%` | `25.77%` | **`0.2644 ± 0.0061`** | `0.3222 ± 0.0203` |
| **  ├ Review Rate (Candidate Found)** | `23.58%` | `23.77%` | `23.02%` | **`0.2346 ± 0.0038`** | `0.0000 ± 0.0000` |
| **  └ Unresolved Rate (No Candidate)** | `2.98%` | `3.22%` | `2.75%` | **`0.0298 ± 0.0024`** | `0.3222 ± 0.0203` |
| **End-to-End Precision** | `1.0000` | `1.0000` | `1.0000` | **`1.0000 ± 0.0000`** *(By construction)* | `0.9846 ± 0.0009` |
| **End-to-End Recall** | `0.5769` | `0.5916` | `0.6127` | **`0.5937 ± 0.0179`** | `0.4893 ± 0.0333` |
| **End-to-End F1 Score** | `0.7316` | `0.7434` | `0.7599` | **`0.7450 ± 0.0141`** | `0.6533 ± 0.0302` |
| **Stage 1 F1 (Txn → Payout)** | `1.0000` | `1.0000` | `1.0000` | **`1.0000 ± 0.0000`** | `0.7818 ± 0.0202` |
| **Stage 2 F1 (Payout → Bank)** | `0.9949` | `0.9938` | `0.9904` | **`0.9930 ± 0.0023`** | `0.8686 ± 0.0166` |
| **False-Match Rate** | **`0.00%`** | **`0.00%`** | **`0.00%`** | **`0.00% (0 errors)`** | `1.54% (4 false commits)` |
| **Committed Balance Residual**| `0 paise` | `0 paise` | `0 paise` | **`0 paise (Exact)`** | `0 paise` |
| **Throughput (Source Rec/s)**| `3,667.8` | `3,215.2` | `3,245.7` | **`3,376.23 ± 226.31 rec/sec`** | `19,593.27 ± 377.96 rec/sec` |
| **Throughput (Groups/s)**| `1,069.0` | `964.3` | `972.7` | **`1,002.03 ± 52.38 groups/sec`** | `5,821.04 ± 191.96 groups/sec` |

---

## 6. Signature Feature: Transparent Evidence Chains & Exception Resolution

For every decision, Realm Verify constructs an explainable evidence chain before committing to the ledger:

### 6.1 Why Did Realm Verify Approve This?
```text
Why did Realm Verify approve PO_2001?
  [✓] Core Ledger Reference: Matched TXN_1001 via synthetic token '882194'
  [✓] Gateway Reference: Validated RZP-PO-882194
  [✓] Bank Statement Reference: Traced in NEFT credit narration
  [✓] Accounting Balance Equation: gross (₹1,200.00) - fee (₹24.00) == net (₹1,176.00) [0 paise residual]
  [✓] Stage 1 Gross Sum: sum(txns) == gross (₹1,200.00 == ₹1,200.00) [0 paise residual]
  [✓] Stage 2 Net Sum: sum(banks) == net (₹1,176.00 == ₹1,176.00) [0 paise residual]
  [✓] Currency Compatibility: INR == INR
  [✓] Settlement Window: Value date within 24h tolerance
  [✓] Uniqueness: Zero double-allocation detected

Result: AUTO-APPROVED (Committed to SQLite Evidence Ledger with SHA-256 Hash Chain)
```

### 6.2 Why Didn't Realm Verify Match This? (Exception Resolution)
```text
Why didn't Realm Verify match PO_2080?
  [✓] Core Ledger Link: Found TXN_1080
  [✗] Gateway Internal Balance: gross (₹1,200.00) - fee (₹5.00) != reported net (₹1,200.00)
      Delta: ₹5.00 residual discrepancy
  [✗] Decision: UNRESOLVED
  [!] Category: MALFORMED_PAYOUT_EQUATION
  [>] Action: Reject payout batch; alert gateway operations team of internal balance equation failure.
```

---

## 7. Real Test Suite Verification (Pytest Output)

All core modules, mathematical constraints, and end-to-end workflows are verified by 19 automated unit and integration tests (zero legacy code):

```text
============================= test session starts =============================
platform win32 -- Python 3.13.9, pytest-8.4.2, pluggy-1.5.0
rootdir: ./realm-verify
configfile: pyproject.toml
collected 19 items

tests/test_end_to_end.py::test_end_to_end_pipeline_and_evidence_ledger PASSED [  5%]
tests/test_generator.py::test_generator_deterministic_seed PASSED        [ 10%]
tests/test_generator.py::test_generator_different_seeds PASSED           [ 15%]
tests/test_generator.py::test_generator_anomaly_distribution PASSED      [ 21%]
tests/test_generator.py::test_generator_integer_minor_amounts_only PASSED [ 26%]
tests/test_llm_reranker.py::test_llm_reranker_disabled_fallback PASSED   [ 31%]
tests/test_llm_reranker.py::test_llm_reranker_schema_validation_and_reordering PASSED [ 36%]
tests/test_llm_reranker.py::test_llm_reranker_malformed_json_fallback PASSED [ 42%]
tests/test_matching.py::test_bipartite_matching_one_to_one PASSED        [ 47%]
tests/test_matching.py::test_batch_subset_matching_many_to_one PASSED    [ 52%]
tests/test_models.py::test_internal_transaction_integer_only PASSED      [ 57%]
tests/test_models.py::test_gateway_payout_model PASSED                   [ 63%]
tests/test_models.py::test_bank_statement_entry_model PASSED             [ 68%]
tests/test_models.py::test_format_inr_function PASSED                    [ 73%]
tests/test_normalizer.py::test_extract_reference_tokens PASSED           [ 78%]
tests/test_normalizer.py::test_parse_timestamp_to_epoch PASSED           [ 84%]
tests/test_normalizer.py::test_normalizer_valid_and_malformed PASSED     [ 89%]
tests/test_validator.py::test_validator_payout_equation_failure PASSED   [ 94%]
tests/test_validator.py::test_validator_cross_currency_policy PASSED     [100%]

============================= 19 passed in 1.32s ==============================
```

---

## 6. Real Logged Exception Queue Samples

Below are real exceptions pulled directly from an executed run (`outputs/exceptions.csv`):

| Source ID | Currency | Amount | Decision & Category | Reason & SOP Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `PO_2245` | `USD` | `USD 25.00` | `NEEDS_REVIEW`<br>`CURRENCY_POLICY_UNSUPPORTED` | **Reason:** Cross-currency transaction detected (USD). Foreign exchange table review required.<br>**Action:** Route to FX desk for FX conversion rate verification and manual settlement approval. *(Generated via SOP rule mapping)* |
| `PO_2028` | `INR` | `₹1,970.00` | `NEEDS_REVIEW`<br>`LOW_CONFIDENCE_AMBIGUITY` | **Reason:** Candidate passed balance checks but reference confidence (0.45) is below auto-approval threshold (0.80).<br>**Action:** Perform secondary reference verification and verify narration tokens before approval. |
| `PO_2080` | `INR` | `₹1,200.00` | `UNRESOLVED`<br>`MALFORMED_PAYOUT_EQUATION` | **Reason:** Payout equation failed: gross=120,000 paise; fees=500 paise; expected net=119,500 paise; reported net=120,000 paise.<br>**Action:** Reject payout batch; alert gateway operations team of internal balance equation failure. |
| `PO_2026` | `INR` | `₹1,990.00` | `UNRESOLVED`<br>`MISSING_INTERNAL_TRANSACTION` | **Reason:** STAGE1_NO_VALID_TRANSACTIONS_MATCHED.<br>**Action:** Trace customer order ID in core order service; check if payment was captured under alternate gateway account. |

---

## 7. How to Run & Replicate

### 7.0 Live Cloud Deployment
- **Frontend (Netlify):** [realmverify.netlify.app](https://realmverify.netlify.app/)
- **Backend (Render):** FastAPI REST API service
- **Full Setup Guide:** See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed cloud configuration.

### 7.1 Installation & Setup (Local Development)
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install Next.js frontend dependencies
npm install
```

### 7.2 Running the Full-Stack Web Application (Next.js + FastAPI)
```bash
# Terminal 1: Launch FastAPI REST Backend
uvicorn src.api:app --reload --port 8000
# or: npm run api

# Terminal 2: Launch Next.js Liquid Glass Web Application
npm run dev
# Opens at: http://localhost:3000
```

### 7.3 CLI & Test Execution
```bash
# 1. Run full automated test suite (19 tests)
pytest tests/ -v

# 2. Generate synthetic noisy multi-source dataset (500+ records)
python -m src.generator --seed 42 --records 500

# 3. Run Exact-Match Baseline
python -m src.main --run-baseline --seed 42

# 4. Run Realm Verify Evidence-Bound Reconciliation Engine
python -m src.main --run-realm-verify --seed 42

# 5. Run Multi-Seed Benchmark across Seeds 42, 43, 44
python -m src.evaluator --seeds 42 43 44

# 6. Verify Deterministic Replay of an Audit Run ID
python -m src.replay --run-id REALM_RUN_S42_1787480828

# 7. (Optional) Run Streamlit Controller Dashboard
streamlit run app.py
```

### 7.4 Generated Output Artifacts
- `outputs/benchmark_report.json` — Aggregated metrics and multi-seed run logs.
- `outputs/benchmark_report.md` — Markdown evaluation report.
- `outputs/reconciliation_report.csv` — Full record-level reconciliation decisions.
- `outputs/exceptions.csv` — Isolated exception queue with failure reasons and recommended actions.
- `outputs/evidence.sqlite` — Append-only evidence ledger with SHA-256 hash chaining.
- `outputs/replay_report.json` — Deterministic replay verification result.

---

## 8. LLM Boundary & Fallback Protocol

- **Where the LLM operates:** The LLM is invoked *only* for residual ambiguous clusters where multiple candidate proposals compete within a narrow score margin.
- **Strict Schema Validation:** LLM responses are parsed into a strict Pydantic schema (`LLMRerankResponse`).
- **No-Key / Failure Fallback:** If `LLM_API_KEY` is not provided, or if the LLM call times out or returns malformed JSON, Realm Verify falls back gracefully to deterministic token scoring without failing open.

---

## 9. Replay & Audit Integrity

```text
┌──────────────────────────────┬───────────────────────────────┐
│ Verification Step            │ Status / Result               │
├──────────────────────────────┼───────────────────────────────┤
│ SHA-256 Hash Chain Integrity │ PASS (369 events verified)    │
│ Source File Hash Match       │ MATCH                         │
│ Total Replayed Decisions     │ 369                           │
│ Exact Decision ID Matches    │ 369 / 369 (100.0%)            │
│ Balance Residual Deviation   │ 0 paise                       │
│ Replay Audit Status          │ DETERMINISTIC_REPLAY_VERIFIED │
└──────────────────────────────┴───────────────────────────────┘
```

> **Reproducibility Note:** Replay was executed using stored input hashes, seed, configuration, and pinned repository environment; it is not a claim of cross-machine bitwise reproducibility.

---

## 10. Honest Limitations

1. **Complex Cross-Currency FX:** Cross-currency records (e.g. USD in INR accounts) are safely routed to `NEEDS_REVIEW` under `CURRENCY_POLICY_UNSUPPORTED`. Automatic approval requires an external real-time FX rate oracle.
2. **Very Large Batch Combinatorics:** Many-to-one batch matching uses a bounded subset search ($k \le 5$ transactions). Batches with $>10$ transactions per payout require integer linear programming (ILP / OR-Tools).
3. **Environment Determinism:** Replay determinism is guaranteed within a pinned Python environment; differences in floating-point math libraries on disparate architectures do not affect the financial ledger since all financial math is strictly integer minor units.
