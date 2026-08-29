"""LLM Semantic Re-ranker for residual ambiguous clusters only.

The LLM is strictly bounded:
1. It is invoked ONLY on narrow ambiguous candidate clusters.
2. It NEVER commits a match or calculates monetary amounts.
3. Strict Pydantic schema validation is enforced.
4. If unavailable, malformed, or missing an API key, falls back safely to deterministic ranking.
"""
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
import requests

from src.models import (
    NormalizedRecord,
    LLMRerankRequest,
    LLMRerankResponse,
)
from src.config import PipelineConfig, DEFAULT_CONFIG

logger = logging.getLogger(__name__)


class LLMReranker:
    """Bounded semantic re-ranker for ambiguous candidate clusters."""

    def __init__(self, config: PipelineConfig = DEFAULT_CONFIG):
        self.config = config
        self.api_key = config.llm_api_key
        self.base_url = config.llm_base_url
        self.model = config.llm_model
        self.is_enabled = bool(self.api_key and len(self.api_key.strip()) > 5)

    def rerank_candidates(
        self,
        query: NormalizedRecord,
        candidates: List[Tuple[NormalizedRecord, float]],
    ) -> Tuple[List[Tuple[NormalizedRecord, float]], Optional[str]]:
        """Re-rank candidate proposals using LLM semantic reasoning if enabled.
        
        Returns (re_ranked_candidates, rationale).
        """
        if not self.is_enabled or len(candidates) <= 1:
            return candidates, None

        # Build structured candidate payload (no secrets, no hidden ground truth)
        candidate_payloads = []
        for cand, score in candidates:
            candidate_payloads.append({
                "record_id": cand.record_id,
                "reference": cand.clean_reference,
                "amount_minor": cand.amount_minor,
                "currency": cand.currency,
                "timestamp": cand.raw_timestamp,
                "retrieval_score": score
            })

        system_prompt = (
            "You are an expert financial ops parser assisting in deterministic reconciliation.\n"
            "Analyze the ambiguous query record and the candidate records.\n"
            "Extract matching reference fragments (e.g. invoice numbers, customer IDs, batch tokens).\n"
            "Rank the candidate record IDs from best match to worst match.\n"
            "Output strictly valid JSON conforming to this schema:\n"
            "{\n"
            '  "ranked_candidate_ids": ["ID1", "ID2"],\n'
            '  "confidence": 0.95,\n'
            '  "rationale": "Explanation of matched tokens and why candidate was selected",\n'
            '  "extracted_tokens": ["token1", "token2"]\n'
            "}"
        )

        user_prompt = (
            f"Query Record ID: {query.record_id}\n"
            f"Source Type: {query.source_type}\n"
            f"Reference: {query.clean_reference}\n"
            f"Amount Minor: {query.amount_minor} ({query.currency})\n"
            f"Timestamp: {query.raw_timestamp}\n\n"
            f"Candidate Records:\n"
            f"{json.dumps(candidate_payloads, indent=2)}"
        )

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }

            resp = requests.post(
                f"{self.base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=body,
                timeout=10
            )

            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                validated = LLMRerankResponse(**parsed)

                # Reorder candidates based on LLM ranking
                cand_map = {c[0].record_id: c for c in candidates}
                reranked: List[Tuple[NormalizedRecord, float]] = []
                for cid in validated.ranked_candidate_ids:
                    if cid in cand_map:
                        orig_cand, orig_score = cand_map[cid]
                        # Boost score by LLM confidence while keeping in [0, 1]
                        boosted_score = min(1.0, max(orig_score, validated.confidence))
                        reranked.append((orig_cand, boosted_score))

                # Append any candidate not explicitly listed by LLM
                for c in candidates:
                    if c[0].record_id not in validated.ranked_candidate_ids:
                        reranked.append(c)

                return reranked, validated.rationale
            else:
                logger.warning("LLM API returned status %d: %s", resp.status_code, resp.text)
                return candidates, "LLM fallback: HTTP error"

        except Exception as e:
            logger.warning("LLM re-ranker failed gracefully with error: %s", e)
            return candidates, f"LLM fallback: {str(e)}"
