"""Deterministic candidate retrieval and blocking module for Realm Verify."""
from typing import List, Dict, Set, Tuple, Optional
from src.models import NormalizedRecord
from src.config import PipelineConfig, DEFAULT_CONFIG


def compute_token_similarity(tokens1: List[str], tokens2: List[str]) -> float:
    """Compute token similarity between two token sets.
    
    Weights specific reference numbers / long alphanumeric tokens heavily.
    """
    s1, s2 = set(tokens1), set(tokens2)
    if not s1 or not s2:
        return 0.0
    
    intersection = s1.intersection(s2)
    if not intersection:
        return 0.0

    # Check if a specific high-entropy token matches (digits or token length >= 4)
    has_specific_token = any(len(t) >= 4 or t.isdigit() for t in intersection)
    
    union = s1.union(s2)
    jaccard = len(intersection) / len(union) if union else 0.0
    
    if has_specific_token:
        # High confidence reference match
        return min(1.0, 0.70 + 0.30 * jaccard)
    return jaccard


def token_overlap_count(tokens1: List[str], tokens2: List[str]) -> int:
    """Count number of shared tokens between two token sets."""
    return len(set(tokens1).intersection(set(tokens2)))


class CandidateRetriever:
    """Blocks and retrieves plausible candidate sets for two-stage reconciliation."""

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG):
        self.config = config
        self._s1_txn_token_map: Dict[str, List[NormalizedRecord]] = {}
        self._s1_txn_amt_map: Dict[int, List[NormalizedRecord]] = {}
        self._s1_txns_id: int = 0

        self._s2_bank_token_map: Dict[str, List[NormalizedRecord]] = {}
        self._s2_bank_amt_map: Dict[int, List[NormalizedRecord]] = {}
        self._s2_banks_id: int = 0

    def build_stage1_index(self, transactions: List[NormalizedRecord]):
        """Build high-speed inverted lookup index for transactions."""
        self._s1_txn_token_map.clear()
        self._s1_txn_amt_map.clear()
        raw_map: Dict[str, List[NormalizedRecord]] = {}
        for t in transactions:
            for tok in t.reference_tokens:
                if len(tok) >= 3:
                    raw_map.setdefault(tok, []).append(t)
            self._s1_txn_amt_map.setdefault(t.amount_minor, []).append(t)
        
        # Retain tokens with high specificity (<= 30 occurrences)
        for tok, records in raw_map.items():
            if len(records) <= 30:
                self._s1_txn_token_map[tok] = records

    def build_stage2_index(self, bank_entries: List[NormalizedRecord]):
        """Build high-speed inverted lookup index for bank entries."""
        self._s2_bank_token_map.clear()
        self._s2_bank_amt_map.clear()
        raw_map: Dict[str, List[NormalizedRecord]] = {}
        for b in bank_entries:
            for tok in b.reference_tokens:
                if len(tok) >= 3:
                    raw_map.setdefault(tok, []).append(b)
            self._s2_bank_amt_map.setdefault(b.amount_minor, []).append(b)

        for tok, records in raw_map.items():
            if len(records) <= 30:
                self._s2_bank_token_map[tok] = records

    def _ensure_s1_index(self, transactions: List[NormalizedRecord]):
        if not self._s1_txn_token_map and transactions:
            self.build_stage1_index(transactions)

    def _ensure_s2_index(self, bank_entries: List[NormalizedRecord]):
        if not self._s2_bank_token_map and bank_entries:
            self.build_stage2_index(bank_entries)

    def retrieve_stage1_candidates(
        self,
        payout: NormalizedRecord,
        transactions: List[NormalizedRecord]
    ) -> List[Tuple[NormalizedRecord, float]]:
        """Retrieve candidate internal transactions for a given gateway payout.
        
        Returns a list of (candidate_txn, candidate_score) sorted by score descending.
        """
        candidates: List[Tuple[NormalizedRecord, float]] = []
        payout_gross = payout.amount_minor
        payout_time = payout.timestamp_epoch
        payout_currency = payout.currency
        payout_tokens = payout.reference_tokens
        tol_seconds = self.config.tolerance_days * 86400

        # Fast inverted index candidate pool
        if len(transactions) > 50:
            self._ensure_s1_index(transactions)
            pool_set = set()
            pool: List[NormalizedRecord] = []
            
            for tok in payout_tokens:
                if len(tok) >= 3:
                    for t in self._s1_txn_token_map.get(tok, []):
                        if t.record_id not in pool_set:
                            pool_set.add(t.record_id)
                            pool.append(t)
            
            for t in self._s1_txn_amt_map.get(payout_gross, []):
                if t.record_id not in pool_set:
                    pool_set.add(t.record_id)
                    pool.append(t)
                    
            search_space = pool
        else:
            search_space = transactions

        for txn in search_space:
            # 1. Hard currency blocking
            if txn.currency != payout_currency:
                continue

            # 2. Date window blocking: txn should be created before payout (or within 1 day margin)
            # and within tolerance_days
            time_diff = payout_time - txn.timestamp_epoch
            if time_diff < -86400 or time_diff > tol_seconds:
                continue

            # 3. Reference token overlap
            tok_sim = compute_token_similarity(payout_tokens, txn.reference_tokens)
            shared_cnt = token_overlap_count(payout_tokens, txn.reference_tokens)

            # 4. Amount compatibility score
            amt_score = 0.0
            if txn.amount_minor == payout_gross:
                amt_score = 1.0
            elif txn.amount_minor < payout_gross:
                # Potential batch member
                amt_score = 0.8 if tok_sim >= 0.7 else 0.5

            if shared_cnt > 0 or amt_score == 1.0:
                # Proximity score
                time_proximity = 1.0 - min(0.1, max(0.0, time_diff / (tol_seconds * 10)))
                # Combine token similarity and amount match
                if tok_sim > 0 and amt_score == 1.0:
                    score = (0.5 * tok_sim + 0.5 * amt_score) * time_proximity
                elif tok_sim > 0:
                    score = tok_sim * 0.9 * time_proximity
                else:
                    score = amt_score * 0.5 * time_proximity
                    
                score = max(0.0, min(1.0, score))
                if score > 0.20:
                    candidates.append((txn, score))

        candidates.sort(key=lambda x: -x[1])
        return candidates

    def retrieve_stage2_candidates(
        self,
        payout: NormalizedRecord,
        bank_entries: List[NormalizedRecord]
    ) -> List[Tuple[NormalizedRecord, float]]:
        """Retrieve candidate bank statement entries for a given gateway payout.
        
        Returns a list of (candidate_bank_entry, candidate_score) sorted by score descending.
        """
        candidates: List[Tuple[NormalizedRecord, float]] = []
        payout_net = payout.raw_payload.get("net_settlement_amount_minor", payout.amount_minor)
        payout_time = payout.timestamp_epoch
        payout_currency = payout.currency
        payout_tokens = payout.reference_tokens
        tol_seconds = self.config.tolerance_days * 86400

        # Fast inverted index candidate pool
        if len(bank_entries) > 50:
            self._ensure_s2_index(bank_entries)
            pool_set = set()
            pool: List[NormalizedRecord] = []
            
            for tok in payout_tokens:
                if len(tok) >= 3:
                    for b in self._s2_bank_token_map.get(tok, []):
                        if b.record_id not in pool_set:
                            pool_set.add(b.record_id)
                            pool.append(b)
            
            for b in self._s2_bank_amt_map.get(payout_net, []):
                if b.record_id not in pool_set:
                    pool_set.add(b.record_id)
                    pool.append(b)
                    
            search_space = pool
        else:
            search_space = bank_entries

        for bank in search_space:
            # 1. Hard currency blocking
            if bank.currency != payout_currency:
                continue

            # 2. Date window blocking: bank settlement should be on or after payout timestamp
            time_diff = bank.timestamp_epoch - payout_time
            if time_diff < -86400 or time_diff > tol_seconds:
                continue

            # 3. Token overlap with narration/reference
            tok_sim = compute_token_similarity(payout_tokens, bank.reference_tokens)
            shared_cnt = token_overlap_count(payout_tokens, bank.reference_tokens)

            # 4. Amount matching
            amt_score = 0.0
            if bank.amount_minor == payout_net:
                amt_score = 1.0
            elif bank.amount_minor < payout_net:
                # Potential split settlement instalment
                amt_score = 0.8 if tok_sim >= 0.7 else 0.5

            if shared_cnt > 0 or amt_score == 1.0:
                time_proximity = 1.0 - min(0.1, max(0.0, time_diff / (tol_seconds * 10)))
                if tok_sim > 0 and amt_score == 1.0:
                    score = (0.5 * tok_sim + 0.5 * amt_score) * time_proximity
                elif tok_sim > 0:
                    score = tok_sim * 0.9 * time_proximity
                else:
                    score = amt_score * 0.5 * time_proximity

                score = max(0.0, min(1.0, score))
                if score > 0.20:
                    candidates.append((bank, score))

        candidates.sort(key=lambda x: -x[1])
        return candidates
