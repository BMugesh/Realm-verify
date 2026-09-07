# GitHub Issues & Post-Submission Bug Tracking

This document preserves the official GitHub Issue records, reproduction traces, root cause analyses, and resolutions for post-submission quality assurance in Realm Verify.

---

## Issue #1: Dashboard and Reconciliation Studio Totals / Record Counts Divergence

- **Issue Number**: `#1`
- **Title**: `[BUG] Dashboard and Reconciliation Studio show divergent totals and record counts for active run`
- **Status**: Closed (resolved by commit `4f631c6`)
- **Tags**: `bug`, `telemetry`, `dashboard`, `reconciliation-studio`, `high-priority`

### 1. Symptom Observed
When viewing financial telemetry for the same upload run ID or synthetic reconciliation batch, the Executive Financial Dashboard (`/dashboard`) and the Reconciliation Studio (`/reconciliation`) displayed diverging figures:
- The Dashboard reflected synthetic seed metrics or previous run volumes (e.g. 500/600 records or ₹2,450.00 / ₹4.5L total cleared) while the Studio displayed user-uploaded custom dataset records (e.g. 24,593 records or 6 records).
- The DarkBankBar in the Studio labeled total gross internal volume (`txns_gross_formatted`) as "Open Internal" and total cleared balance (`reconciled_value_formatted`) as "Open External", creating confusion with the Dashboard's clear distinction between Total Volume, Reconciled Volume, and Flagged Exceptions.

### 2. How it was Found
Cross-page visual audit and end-to-end regression testing between `/dashboard` and `/reconciliation` immediately following custom multi-file CSV dataset ingestion and zero-state resets.

### 3. Suspected Root Cause
1. **Unintended Auto-Seeding**: The backend endpoint `GET /api/runs/current/summary` in `src/api.py` had a fallback where, if `outputs/current_run_summary.json` was absent (such as immediately after a zero-state reset), it automatically triggered `execute_realm_verify(seed=42, records=500)`, silently creating a new synthetic run file on disk and overwriting the active dataset.
2. **Metric Labeling Ambiguity**: In `DarkBankBar.tsx`, the gauge labels "Open Internal" and "Open External" were bound to total volume and reconciled balance instead of explicit ledger labels, conflicting with `DarkComparisonCards.tsx` and the Dashboard.

### 4. Fix Applied
1. Updated `GET /api/runs/current/summary` in `src/api.py` to cleanly return `{"has_run": False, "summary": None}` when no active run file is present, preserving the zero initial state and preventing background auto-seeding.
2. Updated `DarkBankBar.tsx` metric labels to "INTERNAL LEDGER" (`txns_gross_formatted`) and "RECONCILED BALANCE" (`reconciled_value_formatted`) to match the underlying 0-paise mathematical consensus.
3. Created automated consistency test `tests/test_dashboard_studio_consistency.py` asserting that Dashboard and Studio metrics sourced from both endpoints are 100% identical.
4. Linked in commit: `fix: dashboard and studio now read totals from the same reconciliation-run source (fixes #1)`

---

## Issue #2: Payout PO_B01_000001 Unresolved Stage 1 Reason in Explain Modal

- **Issue Number**: `#2`
- **Title**: `[BUG] Explain modal for PO_B01_000001 shows bare ₹0.00 without stating reason for UNRESOLVED Stage 1 status`
- **Status**: Closed (resolved by commit `e41c523`)
- **Tags**: `bug`, `explainability`, `xai`, `exception-queue`, `auditor-agent`

### 1. Symptom Observed
In the Explain modal and Exception Queue for payout `PO_B01_000001`, Stage 1 (Internal Ledger) displayed ₹0.00 matched against a ₹4,124.12 payout gross, resulting in an `UNRESOLVED` decision with 0% confidence, while Stage 2 (bank credit `BNK_B01_000001`, ₹4,041.64 net) matched exactly. The modal displayed a bare ₹0.00 delta without providing a clear textual explanation of why Stage 1 had zero candidate transactions.

### 2. How it was Found
Deep trace inspection of `PO_B01_000001` via `/exceptions` and `/agents` XAI inspector across multi-file batch uploads.

### 3. Root Cause Determination
- **Analysis**: When `PO_B01_000001` was matched against complete datasets containing internal orders `FLPK-ORD-530290` (₹2,334.16) and `FLPK-ORD-417200` (₹1,789.96), `ReconciliationMatcher` successfully solved the 2-to-1 batch consolidation down to 0 paise residual.
- However, in runs where `PO_B01_000001` was an unlinked orphan payout (due to internal transaction invoices missing from the export batch), Stage 1 candidate search legitimately retrieved 0 matching transactions. The deterministic Gatekeeper correctly flagged this as `UNRESOLVED` due to missing internal source records (Case b: genuinely unmatched orphan transaction).
- The Explain modal and `AuditorAgent.generate_narrative` previously lacked specialized phrasing for unlinked orphan payouts, showing a generic discrepancy notice rather than an explicit statement explaining that 0 candidate internal transactions were found.

### 4. Fix Applied
1. Updated `AuditorAgent.generate_narrative` in `src/agents.py` to generate an explicit verdict for orphan payouts:
   `"Unlinked Orphan Payout: 0 candidate internal transactions found within search window / token similarity threshold against target gross ₹4,124.12. Stage 2 bank deposit was successfully matched, but internal ledger source invoice is missing."`
2. Updated `ReconciliationAssistant` in `src/assistant.py` fallback diagnostics to clearly explain 0 Stage 1 candidate matches.
3. Enhanced `ExplainModal.tsx` Stage 1 card with a dedicated warning banner: `"No candidate internal transactions found in search window/token index"`.
4. Created regression test `tests/test_orphan_explanation.py` asserting that AuditorAgent, Assistant, and Matcher handle both unlinked orphan explanations and batch subset reconciliations.
5. Linked in commit: `fix: Explain modal now states reason for UNRESOLVED Stage 1 matches (fixes #2)`
