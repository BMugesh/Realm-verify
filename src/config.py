"""Configuration module for Realm Verify."""
from pathlib import Path
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv

load_dotenv()

class PipelineConfig(BaseModel):
    """Configuration parameters for reconciliation and evaluation."""
    # Data generation
    default_seed: int = 42
    default_record_count: int = 500
    
    # Financial reconciliation tolerances
    tolerance_days: int = 7  # Maximum allowed settlement delay window in days
    min_confidence_threshold: float = 0.80  # Score needed for auto-approval consideration
    score_margin_threshold: float = 0.15   # Difference between top candidate and runner-up
    max_batch_subset_size: int = 5         # Maximum transactions to combine in many-to-one search
    max_split_subset_size: int = 3         # Maximum bank entries to combine in one-to-many split search
    
    # Currency
    base_currency: str = "INR"
    
    # File Paths
    data_dir: Path = Path("data/generated")
    output_dir: Path = Path("outputs")
    evidence_db_path: Path = Path("outputs/evidence.sqlite")
    
    # LLM Re-ranker & Explain Assistant
    llm_api_key: str | None = Field(default_factory=lambda: os.getenv("GROQ_API_KEY", os.getenv("LLM_API_KEY", None)))
    llm_base_url: str = Field(default_factory=lambda: os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1"))
    llm_model: str = Field(default_factory=lambda: os.getenv("LLM_MODEL", "openai/gpt-oss-120b"))

# Global default config
DEFAULT_CONFIG = PipelineConfig()
