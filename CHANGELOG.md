# Changelog

All notable changes to the Realm Verify financial reconciliation engine are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-07

### Post-Submission Fixes & System Hardening

#### 1. Dashboard & Reconciliation Studio State Synchronization ([Commit 4f631c6](https://github.com/BMugesh/Realm-verify/commit/4f631c6c529d8ab7ed4308b54dd3d02a2065c986))
- **Fixes:** Issue #1 ([.github/ISSUES.md](.github/ISSUES.md#issue-1-dashboard-and-reconciliation-studio-state-mismatch))
- **Problem:** When navigating between the Executive Dashboard (`/dashboard`) and Reconciliation Studio (`/reconciliation`), total financial values and record counts diverged for identical runs.
- **Root Cause:** The backend endpoint `GET /api/runs/current/summary` implicitly spawned and wrote a 500-record synthetic Seed 42 run to disk whenever `CURRENT_RUN_FILE` did not exist. This overwrote client-side resets and created a race condition with user CSV uploads. Additionally, the Studio's `DarkBankBar` displayed internal ledger gross values under the bank credit label.
- **Fix:**
  - `src/api.py`: Removed auto-seeding side-effect in `get_current_run_summary()`. The API now cleanly returns `{ "has_run": False, "summary": None }` when uninitialized.
  - `components/reconciliation/DarkBankBar.tsx`: Aligned metric labels to "INTERNAL LEDGER" (`txns_gross_formatted`) and "RECONCILED BALANCE" (`reconciled_value_formatted`) directly sourced from canonical run telemetry.
  - `tests/test_dashboard_studio_consistency.py`: Added automated regression tests asserting 100% mathematical equivalence between Dashboard and Studio metric feeds.
- **User Experience:** Both pages now display identical record counts, match rates, and monetary totals across synthetic seeds and custom CSV uploads.

#### 2. Explainability Trace for Orphan Payout Records ([Commit e41c523](https://github.com/BMugesh/Realm-verify/commit/e41c523bff41d8da4ec29ffedc9e4c5d237f4d00))
- **Fixes:** Issue #2 ([.github/ISSUES.md](.github/ISSUES.md#issue-2-explainability-trace-missingdiagnostics-for-orphan-payout-po_b01_000001))
- **Problem:** Settlement `PO_B01_000001` was flagged as `UNRESOLVED` in certain evaluation batches, and the XAI Explain modal showed a generic uninformative notice without diagnosing why Stage 1 candidate discovery failed.
- **Root Cause:** In targeted test batches where internal orders `FLPK-ORD-530290` and `FLPK-ORD-417200` were omitted from the uploaded internal ledger, `PO_B01_000001` was a legitimate orphan payout. Stage 1 found 0 candidates while Stage 2 successfully matched bank credit `BNK_B01_000001`. The matching logic was mathematically correct, but the narrative generator did not produce a clear explanation for 0-candidate Stage 1 states.
- **Fix:**
  - `src/agents.py`: Enhanced `AuditorAgent.generate_narrative` to explicitly identify unlinked orphan payouts, highlighting the valid Stage 2 bank credit while identifying the missing internal order records.
  - `src/assistant.py`: Updated conversational assistant fallback logic to explain missing counterpart internal transactions.
  - `components/explainability/ExplainModal.tsx`: Added an explicit diagnostic warning banner for unlinked orphan payouts with standard operating procedure (SOP) guidance.
  - `tests/test_orphan_explanation.py`: Added automated test suite verifying orphan narrative generation and 2-to-1 subset matching.
- **User Experience:** Operators inspecting `PO_B01_000001` or any orphan payout now receive an exact diagnostic breakdown explaining why the record is unresolved and what remediation steps are required.

#### 3. Dynamic Multi-Agent Telemetry & Institutional Disclosures ([Commit 48b62d5](https://github.com/BMugesh/Realm-verify/commit/48b62d5fa99e7e5ed9926b3792bdabea086936dd))
- **Problem:** AI Agent telemetry on `/agents` rendered static hardcoded record counts (1,266), and raw bank narrations with institutional 30-character truncation caused visual ambiguity compared to synthetic mock data.
- **Fix:**
  - `src/api.py`: Updated `GET /api/agents/status` to read directly from `CURRENT_RUN_FILE`, dynamically updating records processed and stage F1 metrics for the active run.
  - `app/agents/page.tsx`: Bound sample settlement IDs and inspector selectors to the active reconciliation run with seamless fallback.
  - `app/exceptions/page.tsx`: Added institutional banking disclosure clarifying 30-character upstream core-banking truncation and how Realm Verify reconstructs tokens via fuzzy semantic projection.
- **User Experience:** The AI Agents view reflects live run volumes in real time, and operators understand core banking string constraints without confusion.

#### 4. Issue Tracking & Architectural Documentation ([Commit 96b965e](https://github.com/BMugesh/Realm-verify/commit/96b965ee85a73a02b4dba48f58c351d6f5390070) & [Commit daebffe](https://github.com/BMugesh/Realm-verify/commit/daebffef4c664e481c502d4945c4aa3d972851fa))
- Added `.github/ISSUES.md` detailing root cause analyses, reproduction steps, architectural invariants, and test verification for Issues #1 and #2.
- Updated `README.md` Section 10 with a technical post-submission overview.
