"""Append-only SQLite evidence ledger with SHA-256 hash chaining."""
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from src.models import (
    ReconciliationResult,
    ReconciliationException,
    EvidenceEvent,
)


def compute_event_hash(
    previous_hash: str,
    event_index: int,
    run_id: str,
    record_id: str,
    decision: str,
    payload_str: str,
    timestamp: str
) -> str:
    """Compute SHA-256 hash for an evidence event block."""
    raw = f"{previous_hash}|{event_index}|{run_id}|{record_id}|{decision}|{payload_str}|{timestamp}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class EvidenceStore:
    """Append-only audit ledger for reconciliation events."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initialize append-only SQLite schema."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    dataset_seed INTEGER NOT NULL,
                    pipeline_type TEXT NOT NULL,
                    config_json TEXT NOT NULL,
                    source_hashes_json TEXT NOT NULL,
                    total_records INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS evidence_events (
                    event_id TEXT PRIMARY KEY,
                    event_index INTEGER NOT NULL,
                    run_id TEXT NOT NULL,
                    dataset_seed INTEGER NOT NULL,
                    record_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    validator_results_json TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    previous_event_hash TEXT NOT NULL,
                    event_hash TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES runs(run_id)
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_run_events ON evidence_events(run_id, event_index)
            """)
            conn.commit()

    def record_run_start(
        self,
        run_id: str,
        dataset_seed: int,
        pipeline_type: str,
        config: Dict[str, Any],
        source_hashes: Dict[str, str],
        total_records: int
    ) -> None:
        """Record the start of a reconciliation run with source manifests."""
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO runs 
                (run_id, dataset_seed, pipeline_type, config_json, source_hashes_json, total_records, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    dataset_seed,
                    pipeline_type,
                    json.dumps(config, sort_keys=True),
                    json.dumps(source_hashes, sort_keys=True),
                    total_records,
                    now,
                )
            )
            conn.commit()

    def append_events(
        self,
        run_id: str,
        dataset_seed: int,
        results: List[ReconciliationResult]
    ) -> List[EvidenceEvent]:
        """Append reconciliation decision events with SHA-256 hash chaining."""
        events: List[EvidenceEvent] = []
        now = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Fetch last event hash for this run
            cursor.execute(
                "SELECT event_index, event_hash FROM evidence_events WHERE run_id = ? ORDER BY event_index DESC LIMIT 1",
                (run_id,)
            )
            row = cursor.fetchone()
            if row:
                last_index = row["event_index"]
                last_hash = row["event_hash"]
            else:
                last_index = 0
                last_hash = "GENESIS_BLOCK_" + hashlib.sha256(run_id.encode("utf-8")).hexdigest()[:16]

            for r in results:
                last_index += 1
                event_id = f"EVT_{run_id}_{last_index:05d}"
                payload_dict = r.model_dump(mode="json")
                payload_str = json.dumps(payload_dict, sort_keys=True)
                v_results_str = json.dumps(r.validator_checks, sort_keys=True)

                curr_hash = compute_event_hash(
                    previous_hash=last_hash,
                    event_index=last_index,
                    run_id=run_id,
                    record_id=r.settlement_id,
                    decision=r.decision.value,
                    payload_str=payload_str,
                    timestamp=now
                )

                ev = EvidenceEvent(
                    event_id=event_id,
                    event_index=last_index,
                    run_id=run_id,
                    dataset_seed=dataset_seed,
                    event_type="RECONCILIATION_DECISION",
                    record_id=r.settlement_id,
                    decision=r.decision.value,
                    validator_results=r.validator_checks,
                    payload=payload_dict,
                    previous_event_hash=last_hash,
                    event_hash=curr_hash,
                    timestamp=now
                )
                events.append(ev)

                cursor.execute("""
                    INSERT INTO evidence_events (
                        event_id, event_index, run_id, dataset_seed, record_id, event_type, decision,
                        validator_results_json, payload_json, previous_event_hash, event_hash, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event_id, last_index, run_id, dataset_seed, r.settlement_id, "RECONCILIATION_DECISION", r.decision.value,
                    v_results_str, payload_str, last_hash, curr_hash, now
                ))

                last_hash = curr_hash

            conn.commit()

        return events

    def verify_integrity(self, run_id: str) -> Tuple[bool, str, int]:
        """Verify the SHA-256 hash chain for a given run.
        
        Returns (is_valid, message, count_verified).
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM evidence_events WHERE run_id = ? ORDER BY event_index ASC",
                (run_id,)
            )
            rows = cursor.fetchall()
            if not rows:
                return False, f"No evidence events found for run {run_id}", 0

            expected_prev_hash = "GENESIS_BLOCK_" + hashlib.sha256(run_id.encode("utf-8")).hexdigest()[:16]

            for i, row in enumerate(rows):
                if row["previous_event_hash"] != expected_prev_hash:
                    return (
                        False,
                        f"Hash chain broken at event {row['event_id']}: expected prev_hash {expected_prev_hash} but found {row['previous_event_hash']}",
                        i
                    )

                recomputed_hash = compute_event_hash(
                    previous_hash=row["previous_event_hash"],
                    event_index=row["event_index"],
                    run_id=row["run_id"],
                    record_id=row["record_id"],
                    decision=row["decision"],
                    payload_str=row["payload_json"],
                    timestamp=row["timestamp"]
                )

                if recomputed_hash != row["event_hash"]:
                    return (
                        False,
                        f"Tampered event detected at {row['event_id']}: stored hash {row['event_hash']} != computed {recomputed_hash}",
                        i
                    )

                expected_prev_hash = row["event_hash"]

            return True, f"Hash chain verified successfully across {len(rows)} events", len(rows)

    def get_run_metadata(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve run metadata."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "run_id": row["run_id"],
                "dataset_seed": row["dataset_seed"],
                "pipeline_type": row["pipeline_type"],
                "config": json.loads(row["config_json"]),
                "source_hashes": json.loads(row["source_hashes_json"]),
                "total_records": row["total_records"],
                "created_at": row["created_at"]
            }

    def get_events_for_run(self, run_id: str) -> List[Dict[str, Any]]:
        """Retrieve all events for a run."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM evidence_events WHERE run_id = ? ORDER BY event_index ASC",
                (run_id,)
            )
            rows = cursor.fetchall()
            results = []
            for r in rows:
                results.append({
                    "event_id": r["event_id"],
                    "event_index": r["event_index"],
                    "record_id": r["record_id"],
                    "decision": r["decision"],
                    "validator_results": json.loads(r["validator_results_json"]),
                    "payload": json.loads(r["payload_json"]),
                    "event_hash": r["event_hash"],
                    "previous_event_hash": r["previous_event_hash"],
                    "timestamp": r["timestamp"]
                })
            return results
