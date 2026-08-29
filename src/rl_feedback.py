"""
Realm Verify — Reinforcement Learning & Conversation History Engine.

Provides persistent SQLite storage for multi-turn reconciliation chat sessions,
operator reward feedback (+1/-1), correction exemplars, and in-context
self-correction policy optimization to eliminate hallucinations.
"""

import json
import logging
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.mongo_store import mongo_atlas_store

logger = logging.getLogger("realm_verify.rl_feedback")


class ChatFeedbackPayload(BaseModel):
    record_id: str
    message_id: str
    reward: int = Field(..., description="+1 for positive/accurate, -1 for negative/mistake")
    feedback_text: Optional[str] = Field(default="", description="Operator correction notes")
    query: Optional[str] = Field(default="", description="The user prompt that triggered the response")
    response: Optional[str] = Field(default="", description="The assistant response being evaluated")


class StoredChatMessage(BaseModel):
    message_id: str
    session_id: str
    record_id: str
    role: str
    content: str
    citations_json: Optional[str] = None
    source: str = "assistant"
    timestamp: str
    reward: Optional[int] = None
    feedback_text: Optional[str] = None


class RLStatsResponse(BaseModel):
    total_messages: int
    total_feedback_count: int
    positive_rewards: int
    negative_rewards: int
    accuracy_rating: float
    active_correction_rules_count: int
    learned_correction_rules: List[str]


class RLFeedbackEngine:
    """Manages chat persistence, operator feedback signals, and learned self-correction rules."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_dir = Path(os.getenv("OUTPUT_DIR", "outputs"))
            db_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = str(db_dir / "evidence.sqlite")
        else:
            self.db_path = db_path

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initialize chat sessions, messages, and RL reward tables."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Chat sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    session_id TEXT PRIMARY KEY,
                    record_id TEXT NOT NULL,
                    title TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_record ON chat_sessions(record_id)")

            # Chat messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    message_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    citations_json TEXT,
                    source TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES chat_sessions(session_id)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_record ON chat_messages(record_id)")

            # RL feedback rewards table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_feedback_rewards (
                    feedback_id TEXT PRIMARY KEY,
                    message_id TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    query TEXT,
                    response TEXT,
                    reward INTEGER NOT NULL,
                    feedback_text TEXT,
                    correction_rule TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_feedback_record ON chat_feedback_rewards(record_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_feedback_reward ON chat_feedback_rewards(reward)")

            conn.commit()

    def create_or_get_session(self, record_id: str, session_id: Optional[str] = None) -> str:
        """Create a new chat session or retrieve an existing active session."""
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if session_id:
                cursor.execute("SELECT session_id FROM chat_sessions WHERE session_id = ?", (session_id,))
                row = cursor.fetchone()
                if row:
                    return str(row["session_id"])

            # Generate new session
            new_id = f"sess_{uuid.uuid4().hex[:12]}"
            title = f"Conversation for {record_id}"
            cursor.execute(
                "INSERT INTO chat_sessions (session_id, record_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (new_id, record_id, title, now, now)
            )
            conn.commit()
            return new_id

    def save_message(
        self,
        session_id: str,
        record_id: str,
        role: str,
        content: str,
        citations: Optional[Dict[str, Any]] = None,
        source: str = "assistant",
        message_id: Optional[str] = None,
    ) -> str:
        """Persist a single chat message turn."""
        msg_id = message_id or f"msg_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        cit_json = json.dumps(citations) if citations else None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO chat_messages
                (message_id, session_id, record_id, role, content, citations_json, source, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (msg_id, session_id, record_id, role, content, cit_json, source, now)
            )
            # Update session timestamp
            cursor.execute(
                "UPDATE chat_sessions SET updated_at = ? WHERE session_id = ?",
                (now, session_id)
            )
            conn.commit()

        # Cloud sync to MongoDB Atlas
        try:
            mongo_atlas_store.save_chat_message({
                "message_id": msg_id,
                "session_id": session_id,
                "record_id": record_id,
                "role": role,
                "content": content,
                "citations": citations,
                "source": source,
                "timestamp": now,
            })
        except Exception:
            pass

        return msg_id

    def get_record_history(self, record_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve stored multi-turn conversation history for a record with feedback signals."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT m.message_id, m.session_id, m.record_id, m.role, m.content,
                       m.citations_json, m.source, m.timestamp,
                       f.reward, f.feedback_text
                FROM chat_messages m
                LEFT JOIN chat_feedback_rewards f ON m.message_id = f.message_id
                WHERE m.record_id = ?
                ORDER BY m.timestamp ASC
                LIMIT ?
                """,
                (record_id, limit)
            )
            rows = cursor.fetchall()
            
            history = []
            for r in rows:
                citations = None
                if r["citations_json"]:
                    try:
                        citations = json.loads(r["citations_json"])
                    except Exception:
                        pass

                history.append({
                    "id": r["message_id"],
                    "session_id": r["session_id"],
                    "record_id": r["record_id"],
                    "role": r["role"],
                    "content": r["content"],
                    "citations": citations,
                    "source": r["source"],
                    "timestamp": r["timestamp"],
                    "reward": r["reward"],
                    "feedback_text": r["feedback_text"],
                })
            return history

    def get_sessions_for_record(self, record_id: str) -> List[Dict[str, Any]]:
        """List past conversation sessions for a record."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.session_id, s.record_id, s.title, s.created_at, s.updated_at,
                       COUNT(m.message_id) as message_count
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON s.session_id = m.session_id
                WHERE s.record_id = ?
                GROUP BY s.session_id
                ORDER BY s.updated_at DESC
                """,
                (record_id,)
            )
            return [dict(r) for r in cursor.fetchall()]

    def record_feedback(self, payload: ChatFeedbackPayload) -> Dict[str, Any]:
        """
        Record human reward signal (+1 / -1) and extract self-correction rule.
        When negative reward is received with feedback notes, synthesize a corrective policy rule.
        """
        feedback_id = f"fb_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        # Derive a concise correction rule from feedback text
        correction_rule = None
        if payload.reward == -1 and payload.feedback_text and len(payload.feedback_text.strip()) > 3:
            clean_feedback = payload.feedback_text.strip()
            correction_rule = f"Operator Correction for {payload.record_id}: {clean_feedback}"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO chat_feedback_rewards
                (feedback_id, message_id, record_id, query, response, reward, feedback_text, correction_rule, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    feedback_id,
                    payload.message_id,
                    payload.record_id,
                    payload.query or "",
                    payload.response or "",
                    payload.reward,
                    payload.feedback_text or "",
                    correction_rule,
                    now
                )
            )
            conn.commit()

        logger.info(
            "Recorded chat feedback: id=%s, record=%s, reward=%d, rule=%s",
            feedback_id, payload.record_id, payload.reward, correction_rule
        )

        try:
            mongo_atlas_store.save_feedback({
                "feedback_id": feedback_id,
                "message_id": payload.message_id,
                "record_id": payload.record_id,
                "reward": payload.reward,
                "feedback_text": payload.feedback_text,
                "correction_rule": correction_rule,
                "created_at": now,
            })
        except Exception:
            pass

        return {
            "feedback_id": feedback_id,
            "message_id": payload.message_id,
            "reward": payload.reward,
            "correction_rule": correction_rule,
            "status": "success"
        }

    def get_learned_corrections(self, record_id: Optional[str] = None) -> List[str]:
        """
        Retrieve learned corrective policy rules synthesized from negative operator feedback.
        These are dynamically injected into the system prompt to prevent repeated mistakes.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if record_id:
                cursor.execute(
                    """
                    SELECT correction_rule FROM chat_feedback_rewards
                    WHERE reward = -1 AND correction_rule IS NOT NULL AND (record_id = ? OR record_id = 'GLOBAL')
                    ORDER BY created_at DESC LIMIT 10
                    """,
                    (record_id,)
                )
            else:
                cursor.execute(
                    """
                    SELECT correction_rule FROM chat_feedback_rewards
                    WHERE reward = -1 AND correction_rule IS NOT NULL
                    ORDER BY created_at DESC LIMIT 20
                    """
                )
            rows = cursor.fetchall()
            return [r["correction_rule"] for r in rows if r["correction_rule"]]

    def get_stats(self) -> RLStatsResponse:
        """Compute reinforcement learning telemetry and active policy metrics."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM chat_messages")
            total_messages = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM chat_feedback_rewards")
            total_feedback = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM chat_feedback_rewards WHERE reward = 1")
            pos_feedback = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM chat_feedback_rewards WHERE reward = -1")
            neg_feedback = cursor.fetchone()[0]

            rules = self.get_learned_corrections()

            accuracy = (
                (pos_feedback / total_feedback * 100.0)
                if total_feedback > 0
                else 100.0
            )

            return RLStatsResponse(
                total_messages=total_messages,
                total_feedback_count=total_feedback,
                positive_rewards=pos_feedback,
                negative_rewards=neg_feedback,
                accuracy_rating=round(accuracy, 1),
                active_correction_rules_count=len(rules),
                learned_correction_rules=rules
            )


rl_feedback_engine = RLFeedbackEngine()
