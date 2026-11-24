"""Real ML model loading and inference service.

Never returns fake or fallback predictions. If the trained joblib artifact or
evaluation metrics JSON is missing or unreadable, raises ModelUnavailableError.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.config import METRICS_PATH, MODEL_PATH
from ml.preprocessing import SENTIMENT_LABELS, clean_text


class ModelUnavailableError(RuntimeError):
    """Raised when the trained sentiment model or metrics artifact is missing."""


@dataclass
class PredictionResult:
    predicted_sentiment: str
    confidence: float
    probabilities: dict[str, float]
    model_name: str


class SentimentModelService:
    def __init__(self, model_path: Path = MODEL_PATH, metrics_path: Path = METRICS_PATH) -> None:
        self.model_path = model_path
        self.metrics_path = metrics_path
        self._pipeline: Any = None
        self._model_name: str | None = None
        self._classes: list[str] = []
        self._load_error: str | None = None
        self.load()

    @property
    def is_loaded(self) -> bool:
        return self._pipeline is not None and self.model_path.exists()

    @property
    def model_name(self) -> str | None:
        return self._model_name if self.is_loaded else None

    @property
    def load_error(self) -> str | None:
        if not self.model_path.exists():
            return (
                f"Trained model artifact not found at '{self.model_path}'. "
                "Run 'python -m ml.train' in the backend directory to train and export the model."
            )
        return self._load_error

    def load(self) -> None:
        self._pipeline = None
        self._model_name = None
        self._classes = []
        self._load_error = None

        if not self.model_path.exists():
            self._load_error = (
                f"Trained model artifact not found at '{self.model_path}'. "
                "Run 'python -m ml.train' in the backend directory to train and export the model."
            )
            return

        try:
            bundle = joblib.load(self.model_path)
            if isinstance(bundle, dict) and "pipeline" in bundle:
                self._pipeline = bundle["pipeline"]
                self._model_name = str(bundle.get("model_name", "Trained Sentiment Pipeline"))
                self._classes = [str(c) for c in bundle.get("classes", self._pipeline.classes_)]
            else:
                self._pipeline = bundle
                self._model_name = type(bundle).__name__
                self._classes = [str(c) for c in getattr(bundle, "classes_", SENTIMENT_LABELS)]
        except Exception as exc:
            self._pipeline = None
            self._load_error = f"Failed to load model artifact '{self.model_path}': {exc}"

    def _ensure_loaded(self) -> None:
        if not self.model_path.exists():
            self._pipeline = None
            self._load_error = (
                f"Trained model artifact not found at '{self.model_path}'. "
                "Run 'python -m ml.train' in the backend directory to train and export the model."
            )
            raise ModelUnavailableError(self._load_error)
        if self._pipeline is None:
            self.load()
        if self._pipeline is None:
            raise ModelUnavailableError(self._load_error or "Sentiment model is unavailable.")

    def predict_batch(self, raw_texts: list[str]) -> list[PredictionResult]:
        """Run real batch inference with the loaded scikit-learn pipeline."""
        self._ensure_loaded()
        if not raw_texts:
            return []

        cleaned = [clean_text(t) for t in raw_texts]
        preds = self._pipeline.predict(cleaned)

        has_proba = hasattr(self._pipeline, "predict_proba")
        probs_matrix = self._pipeline.predict_proba(cleaned) if has_proba else None
        classes = [str(c) for c in getattr(self._pipeline, "classes_", self._classes)]

        results: list[PredictionResult] = []
        for idx, pred in enumerate(preds):
            pred_label = str(pred)
            prob_map = {"Positive": 0.0, "Neutral": 0.0, "Negative": 0.0}
            if probs_matrix is not None:
                row = probs_matrix[idx]
                for cls_idx, cls_name in enumerate(classes):
                    if cls_name in prob_map:
                        prob_map[cls_name] = round(float(row[cls_idx]), 4)
                confidence = round(float(np.max(row)), 4)
            else:
                prob_map[pred_label] = 1.0
                confidence = 1.0

            results.append(
                PredictionResult(
                    predicted_sentiment=pred_label,
                    confidence=confidence,
                    probabilities=prob_map,
                    model_name=self._model_name or "Trained Sentiment Model",
                )
            )
        return results

    def predict_one(self, raw_text: str) -> PredictionResult:
        return self.predict_batch([raw_text])[0]

    def load_metrics(self) -> dict[str, Any]:
        if not self.metrics_path.exists():
            raise ModelUnavailableError(
                f"Model evaluation metrics artifact not found at '{self.metrics_path}'. "
                "Run 'python -m ml.train' in the backend directory to generate evaluated test metrics."
            )
        try:
            with self.metrics_path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception as exc:
            raise ModelUnavailableError(
                f"Failed to read model metrics artifact '{self.metrics_path}': {exc}"
            ) from exc


ml_service = SentimentModelService()

