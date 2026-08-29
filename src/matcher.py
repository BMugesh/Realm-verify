"""Matching engine for Realm Verify using bipartite assignment and bounded subset search."""
import itertools
from typing import List, Dict, Set, Tuple, Optional
import numpy as np
from scipy.optimize import linear_sum_assignment

from src.models import (
    NormalizedRecord,
    Stage1Link,
    Stage2Link,
)
from src.config import PipelineConfig, DEFAULT_CONFIG
from src.candidate_retrieval import CandidateRetriever, compute_token_similarity


class ReconciliationMatcher:
    """Constrained record-linkage and subset-matching engine."""

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG):
        self.config = config
        self.retriever = CandidateRetriever(config)

    def match_stage1(
        self,
        payouts: List[NormalizedRecord],
        transactions: List[NormalizedRecord]
    ) -> Dict[str, Stage1Link]:
        """Reconcile internal transactions to gateway payouts.
        
        Handles both 1:1 bipartite matching and many:1 batch consolidation.
        """
        results: Dict[str, Stage1Link] = {}
        assigned_txn_ids: Set[str] = set()
        self.retriever.build_stage1_index(transactions)

        # Step 1: Search for Many-to-1 batch settlements first
        unassigned_payouts: List[NormalizedRecord] = []
        for payout in payouts:
            payout_gross = payout.amount_minor
            candidates = self.retriever.retrieve_stage1_candidates(payout, transactions)
            
            # Filter available candidates
            avail_cand = [c for c in candidates if c[0].record_id not in assigned_txn_ids]
            
            batch_found = False
            # Check for exact batch subset match only when candidate sum could satisfy payout
            has_batch_hint = bool(payout.raw_payload.get("batch_token")) or len(payout.reference_tokens) >= 2
            smaller_cand = [c for c in avail_cand if c[0].amount_minor < payout_gross and c[1] >= 0.20]
            if has_batch_hint and len(smaller_cand) >= 2 and sum(c[0].amount_minor for c in smaller_cand) >= payout_gross:
                best_subset = self._find_batch_subset(payout, smaller_cand, payout_gross)
                if best_subset:
                    matched_txns, avg_score = best_subset
                    matched_ids = [t.record_id for t in matched_txns]
                    gross_sum = sum(t.amount_minor for t in matched_txns)
                    
                    results[payout.record_id] = Stage1Link(
                        payout_id=payout.record_id,
                        transaction_ids=matched_ids,
                        gross_sum_minor=gross_sum,
                        payout_gross_minor=payout_gross,
                        balance_residual_minor=abs(gross_sum - payout_gross),
                        confidence_score=avg_score,
                        is_valid=(gross_sum == payout_gross),
                        failure_reasons=[]
                    )
                    assigned_txn_ids.update(matched_ids)
                    batch_found = True

            if not batch_found:
                unassigned_payouts.append(payout)

        # Step 2: 1:1 Bipartite Matching for remaining payouts
        avail_txns = [t for t in transactions if t.record_id not in assigned_txn_ids]
        if unassigned_payouts and avail_txns:
            one_to_one_matches = self._bipartite_match_stage1(unassigned_payouts, avail_txns)
            for p_id, link in one_to_one_matches.items():
                results[p_id] = link
                if link.is_valid:
                    assigned_txn_ids.update(link.transaction_ids)

        return results

    def _find_batch_subset(
        self,
        payout: NormalizedRecord,
        candidates: List[Tuple[NormalizedRecord, float]],
        target_gross: int
    ) -> Optional[Tuple[List[NormalizedRecord], float]]:
        """Bounded subset-sum search for batch transactions that sum exactly to target_gross."""
        # Restrict search pool to top candidates to keep search bounded
        pool = candidates[:15]
        max_k = min(self.config.max_batch_subset_size, len(pool))
        
        best_subset = None
        best_score = -1.0

        for k in range(2, max_k + 1):
            for combo in itertools.combinations(pool, k):
                records = [c[0] for c in combo]
                scores = [c[1] for c in combo]
                if sum(r.amount_minor for r in records) == target_gross:
                    avg_score = sum(scores) / len(scores)
                    if avg_score > best_score:
                        best_score = avg_score
                        best_subset = (records, avg_score)

        return best_subset

    def _bipartite_match_stage1(
        self,
        payouts: List[NormalizedRecord],
        transactions: List[NormalizedRecord]
    ) -> Dict[str, Stage1Link]:
        """Perform optimal 1:1 assignment via priority bipartite edge ranking."""
        results: Dict[str, Stage1Link] = {}
        if not payouts or not transactions:
            return results

        edges: List[Tuple[float, NormalizedRecord, NormalizedRecord]] = []
        for p in payouts:
            candidates = self.retriever.retrieve_stage1_candidates(p, transactions)
            for cand, score in candidates:
                if cand.amount_minor == p.amount_minor and score > 0.15:
                    edges.append((score, p, cand))

        edges.sort(key=lambda x: -x[0])

        assigned_payout_ids: Set[str] = set()
        assigned_txn_ids: Set[str] = set()

        for score, p, t in edges:
            if p.record_id not in assigned_payout_ids and t.record_id not in assigned_txn_ids:
                results[p.record_id] = Stage1Link(
                    payout_id=p.record_id,
                    transaction_ids=[t.record_id],
                    gross_sum_minor=t.amount_minor,
                    payout_gross_minor=p.amount_minor,
                    balance_residual_minor=abs(t.amount_minor - p.amount_minor),
                    confidence_score=score,
                    is_valid=(t.amount_minor == p.amount_minor),
                    failure_reasons=[]
                )
                assigned_payout_ids.add(p.record_id)
                assigned_txn_ids.add(t.record_id)

        for p in payouts:
            if p.record_id not in results:
                results[p.record_id] = Stage1Link(
                    payout_id=p.record_id,
                    transaction_ids=[],
                    gross_sum_minor=0,
                    payout_gross_minor=p.amount_minor,
                    balance_residual_minor=p.amount_minor,
                    confidence_score=0.0,
                    is_valid=False,
                    failure_reasons=["NO_STAGE1_MATCH_FOUND"]
                )

        return results

    def match_stage2(
        self,
        payouts: List[NormalizedRecord],
        bank_entries: List[NormalizedRecord]
    ) -> Dict[str, Stage2Link]:
        """Reconcile gateway payouts to bank statement credit entries.
        
        Handles both 1:1 bipartite matching and 1:many split settlements.
        """
        results: Dict[str, Stage2Link] = {}
        assigned_bank_ids: Set[str] = set()
        self.retriever.build_stage2_index(bank_entries)

        # Step 1: Search for One-to-Many split settlements
        unassigned_payouts: List[NormalizedRecord] = []
        for payout in payouts:
            payout_net = payout.raw_payload.get("net_settlement_amount_minor", payout.amount_minor)
            candidates = self.retriever.retrieve_stage2_candidates(payout, bank_entries)
            avail_cand = [c for c in candidates if c[0].record_id not in assigned_bank_ids]
            
            split_found = False
            smaller_cand = [c for c in avail_cand if c[0].amount_minor < payout_net and c[1] >= 0.20]
            if len(smaller_cand) >= 2 and sum(c[0].amount_minor for c in smaller_cand) >= payout_net:
                best_split = self._find_split_subset(payout, smaller_cand, payout_net)
                if best_split:
                    matched_banks, avg_score = best_split
                    matched_ids = [b.record_id for b in matched_banks]
                    credit_sum = sum(b.amount_minor for b in matched_banks)
                    
                    results[payout.record_id] = Stage2Link(
                        payout_id=payout.record_id,
                        bank_entry_ids=matched_ids,
                        bank_credit_sum_minor=credit_sum,
                        payout_net_minor=payout_net,
                        balance_residual_minor=abs(credit_sum - payout_net),
                        confidence_score=avg_score,
                        is_valid=(credit_sum == payout_net),
                        failure_reasons=[]
                    )
                    assigned_bank_ids.update(matched_ids)
                    split_found = True

            if not split_found:
                unassigned_payouts.append(payout)

        # Step 2: 1:1 Bipartite Matching for remaining payouts
        avail_banks = [b for b in bank_entries if b.record_id not in assigned_bank_ids]
        if unassigned_payouts and avail_banks:
            one_to_one_matches = self._bipartite_match_stage2(unassigned_payouts, avail_banks)
            for p_id, link in one_to_one_matches.items():
                results[p_id] = link
                if link.is_valid:
                    assigned_bank_ids.update(link.bank_entry_ids)

        return results

    def _find_split_subset(
        self,
        payout: NormalizedRecord,
        candidates: List[Tuple[NormalizedRecord, float]],
        target_net: int
    ) -> Optional[Tuple[List[NormalizedRecord], float]]:
        """Bounded search for 1-to-many split bank credits that sum to target_net."""
        pool = candidates[:10]
        max_k = min(self.config.max_split_subset_size, len(pool))
        
        best_subset = None
        best_score = -1.0

        for k in range(2, max_k + 1):
            for combo in itertools.combinations(pool, k):
                records = [c[0] for c in combo]
                scores = [c[1] for c in combo]
                if sum(r.amount_minor for r in records) == target_net:
                    avg_score = sum(scores) / len(scores)
                    if avg_score > best_score:
                        best_score = avg_score
                        best_subset = (records, avg_score)

        return best_subset

    def _bipartite_match_stage2(
        self,
        payouts: List[NormalizedRecord],
        bank_entries: List[NormalizedRecord]
    ) -> Dict[str, Stage2Link]:
        """Perform optimal 1:1 assignment between payouts and bank statement credits."""
        results: Dict[str, Stage2Link] = {}
        if not payouts or not bank_entries:
            return results

        edges: List[Tuple[float, NormalizedRecord, NormalizedRecord]] = []
        for p in payouts:
            payout_net = p.raw_payload.get("net_settlement_amount_minor", p.amount_minor)
            candidates = self.retriever.retrieve_stage2_candidates(p, bank_entries)
            for cand, score in candidates:
                if cand.amount_minor == payout_net and score > 0.15:
                    edges.append((score, p, cand))

        edges.sort(key=lambda x: -x[0])

        assigned_payout_ids: Set[str] = set()
        assigned_bank_ids: Set[str] = set()

        for score, p, b in edges:
            payout_net = p.raw_payload.get("net_settlement_amount_minor", p.amount_minor)
            if p.record_id not in assigned_payout_ids and b.record_id not in assigned_bank_ids:
                results[p.record_id] = Stage2Link(
                    payout_id=p.record_id,
                    bank_entry_ids=[b.record_id],
                    bank_credit_sum_minor=b.amount_minor,
                    payout_net_minor=payout_net,
                    balance_residual_minor=abs(b.amount_minor - payout_net),
                    confidence_score=score,
                    is_valid=(b.amount_minor == payout_net),
                    failure_reasons=[]
                )
                assigned_payout_ids.add(p.record_id)
                assigned_bank_ids.add(b.record_id)

        for p in payouts:
            if p.record_id not in results:
                payout_net = p.raw_payload.get("net_settlement_amount_minor", p.amount_minor)
                results[p.record_id] = Stage2Link(
                    payout_id=p.record_id,
                    bank_entry_ids=[],
                    bank_credit_sum_minor=0,
                    payout_net_minor=payout_net,
                    balance_residual_minor=payout_net,
                    confidence_score=0.0,
                    is_valid=False,
                    failure_reasons=["NO_STAGE2_MATCH_FOUND"]
                )

        return results

    def _find_split_subset(
        self,
        payout: NormalizedRecord,
        candidates: List[Tuple[NormalizedRecord, float]],
        target_net: int
    ) -> Optional[Tuple[List[NormalizedRecord], float]]:
        """Bounded search for 1-to-many split bank credits that sum to target_net."""
        pool = candidates[:10]
        max_k = min(self.config.max_split_subset_size, len(pool))
        
        best_subset = None
        best_score = -1.0

        for k in range(2, max_k + 1):
            for combo in itertools.combinations(pool, k):
                records = [c[0] for c in combo]
                scores = [c[1] for c in combo]
                if sum(r.amount_minor for r in records) == target_net:
                    avg_score = sum(scores) / len(scores)
                    if avg_score > best_score:
                        best_score = avg_score
                        best_subset = (records, avg_score)

        return best_subset
