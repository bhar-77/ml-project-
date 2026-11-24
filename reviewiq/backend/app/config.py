"""Application configuration with environment variable overrides."""

from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
DATA_DIR = PROJECT_ROOT / "data"

DB_PATH = Path(os.getenv("REVIEWIQ_DB_PATH", str(BACKEND_DIR / "reviewiq.db")))
MODEL_PATH = Path(os.getenv("REVIEWIQ_MODEL_PATH", str(ARTIFACTS_DIR / "sentiment_model.joblib")))
METRICS_PATH = Path(os.getenv("REVIEWIQ_METRICS_PATH", str(ARTIFACTS_DIR / "model_metrics.json")))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "REVIEWIQ_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]

