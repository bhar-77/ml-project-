"""Model evaluation utilities producing real held-out test metrics and confusion matrices."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)

from ml.preprocessing import SENTIMENT_LABELS


def evaluate_classifier(
    model: Any,
    x_test: list[str] | np.ndarray,
    y_test: list[str] | np.ndarray,
    model_name: str,
) -> dict[str, Any]:
    """Evaluate a fitted classifier on the held-out test set."""
    y_pred = model.predict(x_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, labels=SENTIMENT_LABELS, average="macro", zero_division=0))
    weighted_f1 = float(
        f1_score(y_test, y_pred, labels=SENTIMENT_LABELS, average="weighted", zero_division=0)
    )

    prec, rec, f1s, supports = precision_recall_fscore_support(
        y_test, y_pred, labels=SENTIMENT_LABELS, zero_division=0
    )

    per_class: dict[str, dict[str, float | int]] = {}
    for idx, label in enumerate(SENTIMENT_LABELS):
        per_class[label] = {
            "precision": round(float(prec[idx]), 4),
            "recall": round(float(rec[idx]), 4),
            "f1_score": round(float(f1s[idx]), 4),
            "support": int(supports[idx]),
        }

    cm = confusion_matrix(y_test, y_pred, labels=SENTIMENT_LABELS)

    confidence_stats: dict[str, float | None] = {
        "mean_confidence": None,
        "mean_confidence_correct": None,
        "mean_confidence_incorrect": None,
    }
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(x_test)
        max_conf = np.max(probs, axis=1)
        correct_mask = np.asarray(y_pred) == np.asarray(y_test)
        confidence_stats["mean_confidence"] = round(float(np.mean(max_conf)), 4)
        if np.any(correct_mask):
            confidence_stats["mean_confidence_correct"] = round(
                float(np.mean(max_conf[correct_mask])), 4
            )
        if np.any(~correct_mask):
            confidence_stats["mean_confidence_incorrect"] = round(
                float(np.mean(max_conf[~correct_mask])), 4
            )

    return {
        "model_name": model_name,
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "macro_precision": round(float(np.mean(prec)), 4),
        "macro_recall": round(float(np.mean(rec)), 4),
        "per_class": per_class,
        "confusion_matrix": {
            "labels": SENTIMENT_LABELS,
            "matrix": cm.tolist(),
        },
        "confidence_stats": confidence_stats,
    }

