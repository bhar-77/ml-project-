"""CSV dataset inspection, column mapping, cleaning, ML inference, and persistence."""

from __future__ import annotations

import io
from typing import Any, Optional

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.database.models import Dataset, Product, Review
from app.services.complaint_service import detect_complaint_category
from app.services.ml_service import ml_service
from ml.preprocessing import validate_and_clean_dataframe

_COLUMN_HINTS: dict[str, list[str]] = {
    "review_text": ["review_text", "review", "text", "comment", "comments", "feedback", "body", "content", "message"],
    "rating": ["rating", "stars", "star_rating", "score", "overall"],
    "product_name": ["product_name", "product", "item", "item_name", "title", "asin", "sku", "category", "class name"],
    "review_date": ["review_date", "date", "created_at", "timestamp", "time", "review_time"],
}


def _read_csv_bytes(file_bytes: bytes) -> pd.DataFrame:
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding)
            if df.empty or len(df.columns) == 0:
                raise ValueError("CSV contains no data rows or columns.")
            return df
        except UnicodeDecodeError:
            continue
        except pd.errors.EmptyDataError as exc:
            raise ValueError("CSV file has no readable columns or rows.") from exc
    raise ValueError("Unable to decode CSV file. Please upload a valid UTF-8 or Latin-1 CSV.")


def suggest_column_mapping(columns: list[str]) -> dict[str, Optional[str]]:
    lower_map = {col.strip().lower(): col for col in columns}
    mapping: dict[str, Optional[str]] = {
        "review_text": None,
        "rating": None,
        "product_name": None,
        "review_date": None,
    }

    for target, candidates in _COLUMN_HINTS.items():
        # Exact normalized match first
        for cand in candidates:
            if cand in lower_map:
                mapping[target] = lower_map[cand]
                break
        if mapping[target] is not None:
            continue
        # Substring fallback
        for col in columns:
            col_l = col.strip().lower()
            if any(cand in col_l for cand in candidates):
                if col not in mapping.values():
                    mapping[target] = col
                    break

    return mapping


def inspect_csv_upload(file_bytes: bytes, filename: str) -> dict[str, Any]:
    df = _read_csv_bytes(file_bytes)
    columns = [str(c) for c in df.columns.tolist()]
    suggested = suggest_column_mapping(columns)
    preview_df = df.head(8).fillna("")
    sample_rows = preview_df.astype(str).to_dict(orient="records")
    return {
        "filename": filename,
        "total_rows": int(len(df)),
        "columns": columns,
        "suggested_mapping": suggested,
        "sample_rows": sample_rows,
    }


def _get_or_create_products(db: Session, names: list[str]) -> dict[str, Product]:
    unique_names = list(dict.fromkeys(names))
    existing = db.query(Product).filter(Product.name.in_(unique_names)).all()
    product_map = {p.name: p for p in existing}

    new_products = [Product(name=n) for n in unique_names if n not in product_map]
    if new_products:
        db.add_all(new_products)
        db.flush()
        for p in new_products:
            product_map[p.name] = p
    return product_map


def process_csv_upload(
    db: Session,
    file_bytes: bytes,
    filename: str,
    column_mapping: Optional[dict[str, Optional[str]]] = None,
    source: str = "upload",
) -> dict[str, Any]:
    """Validate, clean, classify with trained ML model, and persist an uploaded CSV dataset."""
    df = _read_csv_bytes(file_bytes)
    columns = [str(c) for c in df.columns.tolist()]

    auto_map = suggest_column_mapping(columns)
    effective_map = {
        "review_text": (column_mapping or {}).get("review_text") or auto_map["review_text"],
        "rating": (column_mapping or {}).get("rating") if column_mapping and "rating" in column_mapping else auto_map["rating"],
        "product_name": (column_mapping or {}).get("product_name") if column_mapping and "product_name" in column_mapping else auto_map["product_name"],
        "review_date": (column_mapping or {}).get("review_date") if column_mapping and "review_date" in column_mapping else auto_map["review_date"],
    }

    if not effective_map["review_text"] or effective_map["review_text"] not in columns:
        raise ValueError(
            "Could not identify a review text column. Please map the 'review_text' column explicitly. "
            f"Available columns: {columns}"
        )

    cleaned_df, report = validate_and_clean_dataframe(
        df,
        text_col=effective_map["review_text"],
        rating_col=effective_map["rating"] if effective_map["rating"] in columns else None,
        product_col=effective_map["product_name"] if effective_map["product_name"] in columns else None,
        date_col=effective_map["review_date"] if effective_map["review_date"] in columns else None,
        require_rating=False,
    )

    if len(cleaned_df) == 0:
        raise ValueError(
            "No valid review records remained after removing empty/duplicate rows. "
            "Check that your mapped review text column contains text reviews."
        )

    # Run real batch inference via trained sklearn model (raises ModelUnavailableError if missing)
    predictions = ml_service.predict_batch(cleaned_df["review_text"].tolist())

    dataset_row = Dataset(
        filename=filename,
        source=source,
        raw_rows=report.raw_rows,
        valid_rows=report.valid_rows,
        duplicates_removed=report.duplicates_removed,
        missing_removed=report.missing_text_removed,
    )
    db.add(dataset_row)
    db.flush()

    product_map = _get_or_create_products(db, cleaned_df["product_name"].tolist())

    review_objects: list[Review] = []
    sentiment_breakdown = {"Positive": 0, "Neutral": 0, "Negative": 0}
    confidences: list[float] = []

    for row, pred in zip(cleaned_df.itertuples(index=False), predictions):
        rating_val = None if pd.isna(row.rating) else float(row.rating)
        proxy_val = None if pd.isna(row.proxy_sentiment) else str(row.proxy_sentiment)
        date_val = None if pd.isna(row.review_date) or not row.review_date else str(row.review_date)
        complaint_cat = detect_complaint_category(row.cleaned_text, pred.predicted_sentiment)

        sentiment_breakdown[pred.predicted_sentiment] = (
            sentiment_breakdown.get(pred.predicted_sentiment, 0) + 1
        )
        confidences.append(pred.confidence)

        review_objects.append(
            Review(
                dataset_id=dataset_row.id,
                product_id=product_map[row.product_name].id,
                review_text=row.review_text,
                cleaned_text=row.cleaned_text,
                rating=rating_val,
                proxy_sentiment=proxy_val,
                predicted_sentiment=pred.predicted_sentiment,
                confidence=pred.confidence,
                prob_positive=pred.probabilities["Positive"],
                prob_neutral=pred.probabilities["Neutral"],
                prob_negative=pred.probabilities["Negative"],
                complaint_category=complaint_cat,
                review_date=date_val,
                source=source,
            )
        )

    db.add_all(review_objects)
    db.commit()

    # Build preview of first 12 classified reviews
    preview_items = []
    for rev in review_objects[:12]:
        prod_name = next((name for name, p in product_map.items() if p.id == rev.product_id), "Unspecified Product")
        preview_items.append(
            {
                "id": rev.id,
                "product_name": prod_name,
                "review_text": rev.review_text,
                "rating": rev.rating,
                "proxy_sentiment": rev.proxy_sentiment,
                "predicted_sentiment": rev.predicted_sentiment,
                "confidence": rev.confidence,
                "probabilities": {
                    "Positive": rev.prob_positive,
                    "Neutral": rev.prob_neutral,
                    "Negative": rev.prob_negative,
                },
                "complaint_category": rev.complaint_category,
                "review_date": rev.review_date,
                "source": rev.source,
                "dataset_id": rev.dataset_id,
                "created_at": rev.created_at,
            }
        )

    return {
        "dataset_id": dataset_row.id,
        "filename": filename,
        "raw_rows": report.raw_rows,
        "valid_rows": report.valid_rows,
        "duplicates_removed": report.duplicates_removed,
        "missing_removed": report.missing_text_removed,
        "sentiment_breakdown": sentiment_breakdown,
        "average_confidence": round(float(np.mean(confidences)), 4) if confidences else 0.0,
        "model_name": predictions[0].model_name if predictions else (ml_service.model_name or "Unknown"),
        "preview_predictions": preview_items,
    }

