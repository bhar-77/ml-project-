"""Reproducible training script for ReviewIQ sentiment classification.

Trains and compares:
  1. TF-IDF (1-2 ngrams) + Logistic Regression (class_weight='balanced')
  2. TF-IDF (1-2 ngrams) + Calibrated Linear SVM (LinearSVC + CalibratedClassifierCV)

Prevents train/test leakage by splitting BEFORE vectorization and fitting TF-IDF
strictly inside each scikit-learn Pipeline on training data only.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from ml.download_dataset import MAIN_CSV, prepare_dataset
from ml.evaluate import evaluate_classifier
from ml.preprocessing import SENTIMENT_LABELS, validate_and_clean_dataframe

RANDOM_STATE = 42
TEST_SIZE = 0.20

BACKEND_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
MODEL_ARTIFACT_PATH = ARTIFACTS_DIR / "sentiment_model.joblib"
METRICS_ARTIFACT_PATH = ARTIFACTS_DIR / "model_metrics.json"


def build_pipelines() -> dict[str, Pipeline]:
    """Construct candidate scikit-learn pipelines (TF-IDF + LogReg and TF-IDF + SVM)."""
    lr_pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=25000,
                    min_df=2,
                    max_df=0.95,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    C=1.5,
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )

    svm_pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=25000,
                    min_df=2,
                    max_df=0.95,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "clf",
                CalibratedClassifierCV(
                    estimator=LinearSVC(
                        C=0.6,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                        max_iter=3000,
                    ),
                    cv=3,
                    method="sigmoid",
                ),
            ),
        ]
    )

    return {
        "TF-IDF + Logistic Regression": lr_pipeline,
        "TF-IDF + Calibrated Linear SVM": svm_pipeline,
    }


def train_and_export(
    dataset_path: Path = MAIN_CSV,
    text_col: str = "review_text",
    rating_col: str = "rating",
    product_col: str = "product_name",
    date_col: str = "review_date",
    dataset_name: str = "Amazon Reviews 2023 — Subscription Boxes (McAuley Lab)",
    dataset_source: str = "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023",
) -> dict:
    if not dataset_path.exists():
        print(f"[train] Dataset not found at {dataset_path}. Downloading public dataset...")
        prepare_dataset()

    print(f"[train] Loading dataset: {dataset_path}")
    raw_df = pd.read_csv(dataset_path)
    cleaned_df, cleaning_report = validate_and_clean_dataframe(
        raw_df,
        text_col=text_col,
        rating_col=rating_col,
        product_col=product_col,
        date_col=date_col,
        require_rating=True,
    )

    print(
        f"[train] Cleaning complete: {cleaning_report.raw_rows:,} raw -> "
        f"{cleaning_report.valid_rows:,} valid "
        f"({cleaning_report.missing_text_removed:,} missing, "
        f"{cleaning_report.duplicates_removed:,} duplicates, "
        f"{cleaning_report.invalid_rating_removed:,} invalid ratings removed)"
    )

    x_all = cleaned_df["cleaned_text"].values
    y_all = cleaned_df["proxy_sentiment"].values

    x_train, x_test, y_train, y_test = train_test_split(
        x_all,
        y_all,
        test_size=TEST_SIZE,
        stratify=y_all,
        random_state=RANDOM_STATE,
    )

    print(f"[train] Stratified split: {len(x_train):,} train / {len(x_test):,} held-out test")

    pipelines = build_pipelines()
    evaluations: dict[str, dict] = {}
    fitted_models: dict[str, Pipeline] = {}

    for name, pipeline in pipelines.items():
        print(f"[train] Fitting {name}...")
        pipeline.fit(x_train, y_train)
        metrics = evaluate_classifier(pipeline, x_test, y_test, model_name=name)
        evaluations[name] = metrics
        fitted_models[name] = pipeline
        print(
            f"[eval]  {name}: Accuracy={metrics['accuracy']:.4f}, "
            f"Macro F1={metrics['macro_f1']:.4f}, Weighted F1={metrics['weighted_f1']:.4f}"
        )

    # Select best model by Macro F1 (fair across imbalanced 3-class sentiment)
    selected_name = max(evaluations.keys(), key=lambda k: evaluations[k]["macro_f1"])
    selected_model = fitted_models[selected_name]
    selected_metrics = evaluations[selected_name]

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": selected_model,
            "model_name": selected_name,
            "classes": list(selected_model.classes_),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "random_state": RANDOM_STATE,
        },
        MODEL_ARTIFACT_PATH,
    )

    train_dist = {
        label: int((y_train == label).sum()) for label in SENTIMENT_LABELS
    }
    test_dist = {
        label: int((y_test == label).sum()) for label in SENTIMENT_LABELS
    }

    artifact_report = {
        "selected_model": selected_name,
        "selection_criterion": "Highest Macro F1-score on held-out 20% stratified test set",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "random_seed": RANDOM_STATE,
        "test_split_ratio": TEST_SIZE,
        "leakage_prevention": (
            "Stratified train/test split is performed strictly before TF-IDF vocabulary "
            "and IDF estimation. Vectorizers are fit exclusively inside sklearn Pipelines on training rows."
        ),
        "dataset": {
            "name": dataset_name,
            "source_url": dataset_source,
            "file": dataset_path.name,
            "label_methodology": (
                "Rating-derived proxy labels (1-2 stars = Negative, 3 stars = Neutral, "
                "4-5 stars = Positive). These are proxy labels inferred from star ratings, "
                "not verified human sentiment annotations."
            ),
            "cleaning": cleaning_report.to_dict(),
            "train_samples": int(len(x_train)),
            "test_samples": int(len(x_test)),
            "total_samples": int(len(cleaned_df)),
            "unique_products": int(cleaned_df["product_name"].nunique()),
            "class_distribution": {
                "train": train_dist,
                "test": test_dist,
            },
        },
        "selected_metrics": selected_metrics,
        "model_comparison": list(evaluations.values()),
        "limitations": [
            "Proxy Labels: Sentiment targets are derived from customer star ratings (1-2 Negative, 3 Neutral, 4-5 Positive) rather than human-annotated sentiment polarity.",
            "Neutral Class Ambiguity & Imbalance: 3-star reviews often contain mixed praise and criticism and represent the smallest class, lowering Neutral precision and recall compared to Positive/Negative.",
            "Bag-of-Ngrams Representation: TF-IDF with 1-2 n-grams captures lexical polarity well but cannot fully model sarcasm, long-range discourse negation, or subtle domain metaphors.",
            "Domain Generalization: Performance is measured on e-commerce subscription box reviews; accuracy may degrade on unrelated domains (e.g., technical software or medical reviews) without retraining.",
            "Probability Calibration: Predicted confidence scores reflect statistical separation on the training distribution and should not be interpreted as guaranteed human-level certainty.",
        ],
    }

    with METRICS_ARTIFACT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(artifact_report, fh, indent=2)

    print(f"[train] Selected model: {selected_name} (Macro F1 = {selected_metrics['macro_f1']:.4f})")
    print(f"[train] Saved model artifact -> {MODEL_ARTIFACT_PATH}")
    print(f"[train] Saved evaluation report -> {METRICS_ARTIFACT_PATH}")
    return artifact_report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train ReviewIQ sentiment classification models.")
    parser.add_argument("--dataset", type=Path, default=MAIN_CSV, help="Path to CSV dataset.")
    parser.add_argument("--text-col", default="review_text")
    parser.add_argument("--rating-col", default="rating")
    parser.add_argument("--product-col", default="product_name")
    parser.add_argument("--date-col", default="review_date")
    args = parser.parse_args()

    train_and_export(
        dataset_path=args.dataset,
        text_col=args.text_col,
        rating_col=args.rating_col,
        product_col=args.product_col,
        date_col=args.date_col,
    )


if __name__ == "__main__":
    main()

