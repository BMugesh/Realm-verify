"""
Realm Verify — MongoDB Atlas Cloud Storage & History Synchronization Engine.

Connects to MongoDB Atlas cluster for long-term audit trail, run summaries,
chat history, and operator feedback persistence.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import urllib.parse

logger = logging.getLogger("realm_verify.mongo_store")

# Default MongoDB Atlas URI with provided credentials
DEFAULT_MONGO_USER = "mkbm1307_db_user"
DEFAULT_MONGO_PASS = "vdYkrbBvA1uOEqhR"
DEFAULT_MONGO_CLUSTER = "realm1.litipri.mongodb.net"

try:
    from pymongo import MongoClient
    import certifi
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False


class MongoAtlasStore:
    """Manages cloud persistence of reconciliation runs, evidence events, and chat history."""

    def __init__(self, uri: Optional[str] = None):
        self.username = os.getenv("MONGO_USERNAME", DEFAULT_MONGO_USER)
        self.password = os.getenv("MONGO_PASSWORD", DEFAULT_MONGO_PASS)
        self.cluster = os.getenv("MONGO_CLUSTER", DEFAULT_MONGO_CLUSTER)

        if uri:
            self.uri = uri
        else:
            u_enc = urllib.parse.quote_plus(self.username)
            p_enc = urllib.parse.quote_plus(self.password)
            self.uri = (
                f"mongodb://{u_enc}:{p_enc}@ac-dmhmlom-shard-00-00.litipri.mongodb.net:27017,"
                f"ac-dmhmlom-shard-00-01.litipri.mongodb.net:27017,"
                f"ac-dmhmlom-shard-00-02.litipri.mongodb.net:27017/realm_verify"
                f"?ssl=true&replicaSet=atlas-ubw8ej-shard-0&authSource=admin&retryWrites=true&w=majority"
            )

        self.client: Optional[Any] = None
        self.db: Optional[Any] = None
        self.is_connected = False
        self.last_error: Optional[str] = None

        # Initialize connection
        self._connect()

    def _connect(self) -> bool:
        if not PYMONGO_AVAILABLE:
            self.last_error = "pymongo not installed"
            logger.warning("pymongo is not installed. Cloud MongoDB sync will be disabled.")
            return False

        try:
            self.client = MongoClient(
                self.uri,
                tls=True,
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000,
            )
            # Ping admin database to verify active connection
            self.client.admin.command("ping")
            self.db = self.client["realm_verify"]
            self.is_connected = True
            self.last_error = None
            logger.info("Connected to MongoDB Atlas cluster (%s)", self.cluster)
            return True
        except Exception as e:
            self.is_connected = False
            self.last_error = str(e)
            return False

    def ensure_connected(self) -> bool:
        """Ensure active connection or re-establish if disconnected."""
        if self.is_connected and self.db is not None:
            return True
        return self._connect()

    def save_run_summary(self, summary_dict: Dict[str, Any]) -> bool:
        """Persist a completed reconciliation run summary to MongoDB Atlas."""
        if not self.ensure_connected() or self.db is None:
            return False

        try:
            run_id = summary_dict.get("run_id")
            if not run_id:
                return False

            doc = dict(summary_dict)
            doc["synced_at"] = datetime.now(timezone.utc).isoformat()

            self.db["reconciliation_runs"].update_one(
                {"run_id": run_id},
                {"$set": doc},
                upsert=True
            )
            logger.info("Synced run %s to MongoDB Atlas", run_id)
            return True
        except Exception as e:
            logger.warning("Failed to sync run to MongoDB Atlas: %s", e)
            return False

    def save_chat_message(self, message_dict: Dict[str, Any]) -> bool:
        """Persist chat conversation turn to MongoDB Atlas."""
        if not self.ensure_connected() or self.db is None:
            return False

        try:
            msg_id = message_dict.get("message_id") or message_dict.get("id")
            if not msg_id:
                return False

            doc = dict(message_dict)
            doc["synced_at"] = datetime.now(timezone.utc).isoformat()

            self.db["chat_history"].update_one(
                {"message_id": msg_id},
                {"$set": doc},
                upsert=True
            )
            return True
        except Exception as e:
            logger.warning("Failed to sync chat message to MongoDB Atlas: %s", e)
            return False

    def save_feedback(self, feedback_dict: Dict[str, Any]) -> bool:
        """Persist operator RL reward signal to MongoDB Atlas."""
        if not self.ensure_connected() or self.db is None:
            return False

        try:
            fb_id = feedback_dict.get("feedback_id")
            if not fb_id:
                return False

            doc = dict(feedback_dict)
            doc["synced_at"] = datetime.now(timezone.utc).isoformat()

            self.db["operator_feedback"].update_one(
                {"feedback_id": fb_id},
                {"$set": doc},
                upsert=True
            )
            return True
        except Exception as e:
            logger.warning("Failed to sync feedback to MongoDB Atlas: %s", e)
            return False

    def get_all_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch historical runs from MongoDB Atlas."""
        if not self.ensure_connected() or self.db is None:
            return []

        try:
            cursor = self.db["reconciliation_runs"].find(
                {},
                {"_id": 0}
            ).sort("created_at", -1).limit(limit)
            return list(cursor)
        except Exception as e:
            logger.warning("Failed to fetch runs from MongoDB Atlas: %s", e)
            return []

    def get_status(self) -> Dict[str, Any]:
        """Return MongoDB Atlas connection and telemetry status."""
        self.ensure_connected()
        return {
            "is_connected": self.is_connected,
            "cluster": self.cluster,
            "username": self.username,
            "database": "realm_verify",
            "last_error": self.last_error,
            "driver": "pymongo" if PYMONGO_AVAILABLE else "none",
        }


mongo_atlas_store = MongoAtlasStore()
