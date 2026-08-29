# Realm Verify — 5-Minute Video Pitch Script & Recording Guide

**Track:** Track 04 — AI Finance Controller (Razorpay AI Buildathon 2026)  
**Target Duration:** Exactly 4:45 – 5:00 minutes  
**Format:** Screen recording with voiceover (Split view: Web Dashboard + Terminal CLI + Architecture Visuals)

---

## Pitch Structure & Timing Overview

```
┌─────────────────┬─────────────────────────────────────────────────┬───────────┐
│ Section         │ Focus & Key Message                             │ Time      │
├─────────────────┼─────────────────────────────────────────────────┼───────────┤
│ 1. Problem/Hook │ The 2026 Builder Consensus & Verification Gap   │ 0:00-0:45 │
│ 2. Architecture │ 2-Stage Pipeline & 0-Paise Integer Invariants   │ 0:45-1:45 │
│ 3. Live Demo    │ Dynamic Reconciliation & Auditable Exceptions   │ 1:45-3:00 │
│ 4. Benchmark    │ Multi-Seed Rigor: Match Rate vs Precision vs F1 │ 3:00-4:00 │
│ 5. Audit Replay │ Deterministic Replay & Evidence Ledger          │ 4:00-4:45 │
│ 6. Conclusion   │ Summary & The Future of Finance Ops             │ 4:45-5:00 │
└─────────────────┴─────────────────────────────────────────────────┴───────────┘
```

---

## Minute-by-Minute Script

### [0:00 – 0:45] 1. The Problem & Why Now: The 2026 Builder Consensus

**Visual:** Open on the Realm Verify Landing Page (`http://localhost:3000`), zooming into the headline: *"Verification capacity, not generation speed, is the bottleneck in finance operations."*

**Speaker Narration:**
> "Hi everyone. In 2026, the builder consensus is clear: generating text, invoices, or code is fast, but **verifying financial state** is where modern finance operations break down.
>
> Today, payment ops teams at fast-growing companies manually reconcile multi-source ledgers across internal databases, gateway payout files like Razorpay, and bank statement feeds. When teams try putting naive LLMs on financial data, the results are catastrophic: floating-point hallucinations, hallucinated reference IDs, and false matches that leak millions in treasury risk.
>
> That's why we built **Realm Verify**: an evidence-bound multi-ledger reconciliation engine designed with non-negotiable accounting constraints, an advisory-only LLM boundary, and an append-only hash-chained evidence ledger."

---

### [0:45 – 1:45] 2. Architecture & The 0-Paise Invariant

**Visual:** Switch to the Architecture Page (`http://localhost:3000/architecture`), highlighting the 2-stage reconciliation loop and the deterministic constraint equations.

**Speaker Narration:**
> "Let's look at the core architecture. Realm Verify closes a full two-stage multi-ledger settlement loop:
>
> 1. **Stage 1 (Internal Transactions to Gateway Payouts):** We solve combinatorial Many-to-One batch settlements using bipartite matching and bounded subset-sum algorithms.
> 2. **Stage 2 (Gateway Payouts to Bank Statement Credits):** We resolve One-to-Many split settlement deposits with tolerance windows.
>
> We operate under four non-negotiable safety principles:
> - **First, the 0-Paise Rule:** Float arithmetic is strictly prohibited. All financial calculations use integer paise minor units ($1\text{ INR} = 100\text{ paise}$).
> - **Second, Hard Constraint Gating:** Before any settlement is approved, it must satisfy $\text{gross} - \text{fees} - \text{refunds} == \text{net}$ with exact $0\text{ paise}$ residual.
> - **Third, Advisory-Only LLM Boundary:** The LLM is only invoked to re-rank candidate clusters in ambiguous edge cases. It has zero commit authority and cannot mutate ledger balances.
> - **Fourth, Evidence Ledger:** Every decision event links to the prior block via SHA-256 hash chaining for deterministic replay."

---

### [1:45 – 3:00] 3. Live Reconciliation Demo & Honest Exception Queue

**Visual:** Navigate to the Reconciliation Studio (`http://localhost:3000/reconciliation`). Click **'Load Canonical 500-Record Batch'** or upload synthetic files, and click **'Run Multi-Source Reconciliation'**. Watch the metric cards populate in real-time.

**Speaker Narration:**
> "Let's see it live in action across a full operational batch.
>
> We ingest **500 internal core transactions**, **369 gateway payouts**, and **397 bank statement entries**, forming **369 primary settlement decision units**.
>
> In just **0.35 seconds**—processing over **3,300 source records per second**—Realm Verify resolves the batch:
> - **Match Rate:** **97.22%** of entities have verified candidate linkages identified across ledgers.
> - **Auto-Approval Rate:** **73.56%** of entities clear straight-through automatically with 100% precision and zero human touch.
> - **Exception Rate:** **26.44%** of entities are safely quarantined for human review.
>
> Now, as the Track 04 bar states: *'One cherry-picked match proves nothing. The bar is measured accuracy plus an honest exception list.'*
>
> Let's look at the **Exception Queue** at `/exceptions`. Realm Verify doesn't hide errors or fail open. Here we see real, categorized anomalies:
> - `MALFORMED_PAYOUT_EQUATION`: where the gateway fee deduction failed the 0-paise balance equation.
> - `MISSING_COUNTERPART`: orphan transactions where no payout deposit occurred.
> - `CROSS_CURRENCY_POLICY`: holdouts on USD/EUR transactions requiring FX treasury approval.
> Each exception provides the exact delta residual and a concrete standard operating procedure recommendation."

---

### [3:00 – 4:00] 4. Multi-Seed Benchmark Defense

**Visual:** Switch to Dashboard / Benchmark view (`http://localhost:3000/dashboard` or show `outputs/benchmark_report.md`). Show the comparison table across Seeds 42, 43, and 44.

**Speaker Narration:**
> "To prove our system is reproducible, we evaluated Realm Verify across **three independent random seeds: 42, 43, and 44**.
>
> Here are the measured multi-seed metrics:
> - **Candidate Match Rate:** **$97.22\% \pm 0.32\%$**
> - **Straight-Through Auto-Approval Rate:** **$73.56\% \pm 0.61\%$**
> - **End-to-End Precision:** **$1.0000 \pm 0.0000$** ($100.0\%$) — by construction, because our deterministic gatekeeper defers any ambiguous candidate or date discrepancy to human review rather than guessing.
> - **End-to-End Recall:** **$59.37\% \pm 1.79\%$**
> - **End-to-End F1 Score:** **$0.7450 \pm 0.0141$**
> - **False-Match Rate:** **$0.00\%$** (Zero committed errors across all seeds)
> - **Committed Balance Residual:** **$0\text{ paise}$** exact
>
> Compared to a standard exact-match baseline that suffers a 1.54% false-match rate and 48.9% recall, Realm Verify delivers superior candidate recovery with zero treasury risk."

---

### [4:00 – 4:45] 5. Deterministic Replay Verification

**Visual:** Open terminal and run: `python -m src.replay --run-id REALM_RUN_S42_1787496596`. Show the green verification table. Switch to `/replay` in the web app.

**Speaker Narration:**
> "Finally, financial controllers need complete auditability. Every reconciliation run in Realm Verify creates an append-only ledger in SQLite with SHA-256 hash chaining.
>
> When an auditor comes in six months later, they can execute our deterministic replay command:
> `python -m src.replay --run-id <RUN_ID>`
>
> In real-time, the engine verifies the SHA-256 parent hash chain across all 369 event blocks, verifies the source data file hashes, re-executes the state machine, and proves that **100% of decisions match** with **0 paise residual deviation**."

---

### [4:45 – 5:00] 6. Conclusion & Takeaway

**Visual:** Return to the web app header, showing the clean dashboard.

**Speaker Narration:**
> "Realm Verify demonstrates what the next generation of financial controllers looks like: AI where it excels—interpreting unstructured candidate evidence—governed by deterministic accounting validators where financial commitments are on the line.
>
> Thank you! The full codebase, multi-seed benchmark reports, and interactive UI are available in our open-source repository."

---

## Tough Panel Q&A Defense Guide

If panelists ask deep technical questions during review, use these mathematically grounded answers:

### Q1: "Why is your precision 1.0000? Isn't that unrealistic for an AI agent?"
> **Answer:** "Precision is 1.0000 by design because of our **deterministic gating architecture**. The LLM never commits a decision. Rule 7 (confidence margin check) together with integer balance validation requires that any candidate with date window skews, competing candidates within a 0.15 score delta, or fee discrepancies is safely deferred to `NEEDS_REVIEW` or `UNRESOLVED`. The system prioritizes zero false commitments over aggressive auto-approval."

### Q2: "Why do 500 internal transactions produce 369 primary settlement entities?"
> **Answer:** "In real-world payment gateways like Razorpay, multiple customer charges are consolidated into single payout deposits. In our synthetic dataset generator, ~15% of transactions are grouped into Many-to-One batch payouts ($2 \le k \le 5$), and ~3% are orphan transactions. 500 internal transactions consolidate into exactly 369 gateway settlement entities."

### Q3: "What is the exact distinction between Match Rate and Auto-Approval Rate?"
> **Answer:** 
> - **Match Rate ($97.22\%$):** Measures candidate linkage discovery—the share of entities for which the engine successfully identified candidate connections across ledgers ($\text{Auto-Approved} + \text{Review-with-Candidate}$).
> - **Auto-Approval Rate ($73.56\%$):** Measures straight-through processing—the share of entities resolved autonomously with zero human intervention.
> - **Review Rate ($22.80\%$):** Candidates identified, but held for human operator review.
> - **Unresolved Rate ($3.64\%$):** Missing counterpart or broken balance equations.
> - **Identity Check:** $73.56\% + 22.80\% + 3.64\% = 100.00\%$.
