"""Data models and schemas for Realm Verify.

Every monetary value is stored strictly in integer minor units (e.g. paise for INR).
Floating point numbers are NEVER used for monetary values or ledger arithmetic.
"""
from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, field_validator


class DecisionStatus(str, Enum):
    """Reconciliation decision status."""
    AUTO_APPROVED = "AUTO_APPROVED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    UNRESOLVED = "UNRESOLVED"


class InternalTransaction(BaseModel):
    """Core internal ledger transaction."""
    transaction_id: str
    customer_reference: str
    gross_amount_minor: int = Field(description="Gross amount in minor units (paise)")
    net_amount_minor: int = Field(description="Net amount in minor units (paise)")
    currency: str = "INR"
    created_at: str = Field(description="ISO 8601 UTC timestamp")
    payment_status: str = "captured"

    @field_validator("gross_amount_minor", "net_amount_minor")
    @classmethod
    def validate_integer_minor(cls, v: int) -> int:
        if not isinstance(v, int):
            raise TypeError("Monetary amounts must be strictly integers (minor units)")
        return v


class GatewayPayout(BaseModel):
    """Gateway settlement payout report record."""
    payout_id: str
    gateway_reference: str
    gross_amount_minor: int = Field(description="Gross payout amount in paise")
    processing_fee_minor: int = Field(default=0, description="Processing fees in paise")
    refund_amount_minor: int = Field(default=0, description="Refund deductions in paise")
    chargeback_amount_minor: int = Field(default=0, description="Chargeback deductions in paise")
    net_settlement_amount_minor: int = Field(description="Net settlement amount in paise")
    currency: str = "INR"
    settlement_timestamp: str = Field(description="ISO 8601 UTC timestamp")
    batch_token: Optional[str] = None

    @field_validator(
        "gross_amount_minor",
        "processing_fee_minor",
        "refund_amount_minor",
        "chargeback_amount_minor",
        "net_settlement_amount_minor",
    )
    @classmethod
    def validate_integer_minor(cls, v: int) -> int:
        if not isinstance(v, int):
            raise TypeError("Monetary amounts must be strictly integers (minor units)")
        return v


class BankStatementEntry(BaseModel):
    """Bank statement feed credit/debit entry."""
    bank_entry_id: str
    bank_reference: str
    narration: str
    credit_amount_minor: int = Field(default=0, description="Credit amount in paise")
    debit_amount_minor: int = Field(default=0, description="Debit amount in paise")
    currency: str = "INR"
    value_date: str = Field(description="Value date YYYY-MM-DD")
    settlement_timestamp: str = Field(description="ISO 8601 UTC timestamp")

    @field_validator("credit_amount_minor", "debit_amount_minor")
    @classmethod
    def validate_integer_minor(cls, v: int) -> int:
        if not isinstance(v, int):
            raise TypeError("Monetary amounts must be strictly integers (minor units)")
        return v


class GroundTruthGroup(BaseModel):
    """Hidden ground truth settlement group for benchmark evaluation only.
    
    NEVER exposed to the agent or matching pipeline.
    """
    canonical_settlement_group_id: str
    transaction_ids: List[str] = Field(default_factory=list)
    payout_ids: List[str] = Field(default_factory=list)
    bank_entry_ids: List[str] = Field(default_factory=list)
    anomaly_category: str
    expected_status: DecisionStatus = DecisionStatus.AUTO_APPROVED
    notes: Optional[str] = None


class NormalizedRecord(BaseModel):
    """Normalized metadata for fast candidate matching."""
    record_id: str
    source_type: str  # "TRANSACTION", "PAYOUT", "BANK_ENTRY"
    reference_tokens: List[str] = Field(default_factory=list)
    clean_reference: str = ""
    amount_minor: int
    currency: str
    timestamp_epoch: int
    raw_timestamp: str
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class Stage1Link(BaseModel):
    """Link between internal transaction(s) and a gateway payout."""
    payout_id: str
    transaction_ids: List[str]
    gross_sum_minor: int
    payout_gross_minor: int
    balance_residual_minor: int
    confidence_score: float
    is_valid: bool
    failure_reasons: List[str] = Field(default_factory=list)


class Stage2Link(BaseModel):
    """Link between gateway payout and bank statement credit(s)."""
    payout_id: str
    bank_entry_ids: List[str]
    bank_credit_sum_minor: int
    payout_net_minor: int
    balance_residual_minor: int
    confidence_score: float
    is_valid: bool
    failure_reasons: List[str] = Field(default_factory=list)


class CandidateProposal(BaseModel):
    """Proposed match candidate from retrieval/LLM layer."""
    candidate_id: str
    source_ids: List[str]
    target_ids: List[str]
    retrieval_score: float
    llm_confidence: Optional[float] = None
    llm_rationale: Optional[str] = None
    extracted_tokens: List[str] = Field(default_factory=list)


class LLMRerankRequest(BaseModel):
    """Input payload sent to LLM for residual ambiguous clusters."""
    query_record_id: str
    query_source: str
    query_reference: str
    query_narration: str
    query_amount_inr: str
    query_timestamp: str
    candidate_records: List[Dict[str, Any]]


class LLMRerankResponse(BaseModel):
    """Structured output expected from LLM re-ranker."""
    ranked_candidate_ids: List[str]
    confidence: float
    rationale: str
    extracted_tokens: List[str] = Field(default_factory=list)


class ReconciliationResult(BaseModel):
    """Full two-stage reconciliation decision for a settlement entity."""
    settlement_id: str
    decision: DecisionStatus
    stage1: Optional[Stage1Link] = None
    stage2: Optional[Stage2Link] = None
    confidence_score: float = 0.0
    score_margin: float = 0.0
    validator_checks: Dict[str, bool] = Field(default_factory=dict)
    failure_reasons: List[str] = Field(default_factory=list)
    reconciliation_timestamp: str = ""
    is_fully_reconciled: bool = False


class ReconciliationException(BaseModel):
    """Exception item routed to human-review or audit queue."""
    exception_id: str
    source_id: str
    source_type: str  # "TRANSACTION", "PAYOUT", "BANK_ENTRY", "SETTLEMENT"
    decision: DecisionStatus
    category: str
    reason: str
    candidate_ids: List[str] = Field(default_factory=list)
    amount_minor: int = 0
    currency: str = "INR"
    recommended_action: str = ""


class EvidenceEvent(BaseModel):
    """Hash-chained append-only audit event."""
    event_id: str
    event_index: int
    previous_event_hash: str
    event_hash: str
    run_id: str
    dataset_seed: int
    event_type: str
    record_id: str
    decision: str
    validator_results: Dict[str, bool] = Field(default_factory=dict)
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str


def format_inr(paise: int) -> str:
    """Format paise integer into INR string representation (e.g. ₹1,234.56)."""
    sign = "-" if paise < 0 else ""
    abs_paise = abs(paise)
    rupees = abs_paise // 100
    remainder = abs_paise % 100
    
    s = str(rupees)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        rupees_str = ",".join(groups) + "," + last3
    else:
        rupees_str = s
        
    return f"{sign}₹{rupees_str}.{remainder:02d}"


def format_money(amount_minor: int, currency: str = "INR") -> str:
    """Format minor units according to currency without mixing units."""
    curr = currency.upper().strip()
    if curr == "INR":
        return format_inr(amount_minor)
    
    sign = "-" if amount_minor < 0 else ""
    abs_minor = abs(amount_minor)
    major = abs_minor // 100
    minor = abs_minor % 100
    return f"{curr} {sign}{major:,}.{minor:02d}"
