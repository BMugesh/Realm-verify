# Realm Verify — Pipeline Architecture

## 1. System Overview

Realm Verify is an evidence-bound multi-ledger reconciliation engine designed for the **Razorpay AI Buildathon 2026 (AI Finance Controller Track)**.

### Core Thesis
> **Verification capacity—not generation speed—is the bottleneck in finance operations.** AI may interpret messy operational evidence, but it must never commit a financial decision unless deterministic accounting constraints validate it.

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

    subgraph Retrieval["3. Candidate Retrieval & Matching"]
        STAGE1[Stage 1 Matcher<br/>• Bipartite Assignment<br/>• Bounded Subset-Sum Search]
        STAGE2[Stage 2 Matcher<br/>• Bipartite Assignment<br/>• Split-Settlement Search]
        LLM[Optional LLM Re-Ranker<br/>• Ambiguous Clusters Only<br/>• Strict JSON Schema Validation]
    end

    subgraph Validator["4. Deterministic Accounting Validator"]
        V_EQ[Payout Internal Balance<br/>gross - fees - refunds == net]
        V_S1[Stage 1 Batch Gross<br/>sum(txns) == payout gross]
        V_S2[Stage 2 Bank Net<br/>sum(banks) == payout net]
        V_POL[Currency & Date Window Policies]
    end

    subgraph Decisions["5. Decision Routing & Ledger"]
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

## 2. Two-Stage Financial Reconciliation

Financial reconciliation in modern payment gateways requires linking three asynchronous data streams:
1. **Stage 1 (Internal Transactions → Gateway Payouts):**
   - Matches one internal transaction or many batched transactions ($2 \le k \le 5$) to a gateway payout.
   - Enforces gross equality: $\sum \text{txn.gross\_amount\_minor} == \text{payout.gross\_amount\_minor}$.
2. **Stage 2 (Gateway Payouts → Bank Statement Credits):**
   - Matches a gateway payout net settlement to one bank credit or a split settlement ($2 \le m \le 3$).
   - Enforces net equality: $\sum \text{bank.credit\_amount\_minor} == \text{payout.net\_settlement\_amount\_minor}$.

A transaction is considered **end-to-end reconciled** if and only if both Stage 1 and Stage 2 links pass deterministic validation.

---

## 3. Strict Deterministic Accounting Rules

All monetary calculations use integer paise ($1 \text{ INR} = 100 \text{ paise}$). Float arithmetic is strictly prohibited.

1. **Payout Internal Balance:**
   $$\text{gross\_amount\_minor} - \text{processing\_fee\_minor} - \text{refund\_amount\_minor} - \text{chargeback\_amount\_minor} == \text{net\_settlement\_amount\_minor}$$
2. **Stage 1 Batch Sum Balance:**
   $$\sum_{t \in T} t.\text{gross\_amount\_minor} == \text{payout.gross\_amount\_minor}$$
3. **Stage 2 Bank Credit Balance:**
   $$\sum_{b \in B} b.\text{credit\_amount\_minor} == \text{payout.net\_settlement\_amount\_minor}$$
4. **Date Ordering Constraint:**
   $$\text{txn.created\_at} \le \text{payout.settlement\_timestamp} \le \text{bank.settlement\_timestamp} + \text{tolerance\_days}$$
5. **Currency Consistency:**
   $$\text{txn.currency} == \text{payout.currency} == \text{bank.currency} == \text{Base Currency (INR)}$$
   Non-base currency records (e.g. USD/EUR) are routed to `NEEDS_REVIEW` under FX policy.
6. **Uniqueness Constraint:**
   No record may be assigned to more than one settlement group.

---

## 4. Append-Only Evidence Ledger & Deterministic Replay

All decision events are recorded in an append-only SQLite database (`outputs/evidence.sqlite`) with SHA-256 hash chaining:

$$\text{event\_hash}_i = \text{SHA256}(\text{event\_hash}_{i-1} \parallel \text{event\_index}_i \parallel \text{run\_id} \parallel \text{record\_id} \parallel \text{decision} \parallel \text{payload} \parallel \text{timestamp})$$

- **Deterministic Replay:** Re-executing any historical run via `python -m src.replay --run-id <run_id>` recomputes decisions and verifies $100.0\%$ decision ID matching and $0 \text{ paise}$ balance residual deviation.
