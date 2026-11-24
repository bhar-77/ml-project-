"""ReviewIQ REST API endpoints."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Dataset, Product, Review
from app.models.schemas import (
    AnalyzeReviewRequest,
    AnalyzeReviewResponse,
    DatasetPreviewResponse,
    DatasetSummary,
    DatasetUploadResponse,
    HealthResponse,
    PaginatedReviewsResponse,
)
from app.services.analytics_service import (
    get_overview_analytics,
    get_product_comparison,
    get_sentiment_analytics,
    serialize_review,
)
from app.services.complaint_service import (
    cluster_negative_reviews,
    detect_complaint_category,
    is_sentence_transformers_available,
)
from app.services.dataset_service import inspect_csv_upload, process_csv_upload
from app.services.ml_service import ModelUnavailableError, ml_service
from ml.preprocessing import clean_text, map_rating_to_proxy_sentiment

router = APIRouter(prefix="/api", tags=["ReviewIQ API"])


@router.get("/health", response_model=HealthResponse, summary="System, database, and ML model health")
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    db_ok = True
    total_reviews = 0
    total_products = 0
    total_datasets = 0
    try:
        db.execute(text("SELECT 1"))
        total_reviews = db.query(Review).count()
        total_products = db.query(Product).count()
        total_datasets = db.query(Dataset).count()
    except Exception:
        db_ok = False

    # Re-check artifact availability dynamically so missing artifacts are always caught
    if not ml_service.is_loaded and ml_service.model_path.exists():
        ml_service.load()

    metrics_ok = ml_service.metrics_path.exists()
    model_loaded = ml_service.is_loaded

    return HealthResponse(
        status="ok" if (db_ok and model_loaded) else "degraded",
        database_connected=db_ok,
        model_loaded=model_loaded,
        model_name=ml_service.model_name,
        model_error=ml_service.load_error if not model_loaded else None,
        metrics_available=metrics_ok,
        sentence_transformers_available=is_sentence_transformers_available(),
        total_reviews=total_reviews,
        total_products=total_products,
        total_datasets=total_datasets,
    )


@router.post(
    "/reviews/analyze",
    response_model=AnalyzeReviewResponse,
    summary="Analyze a single review with the trained ML classifier and persist to SQLite",
)
def analyze_review(
    payload: AnalyzeReviewRequest,
    db: Session = Depends(get_db),
) -> AnalyzeReviewResponse:
    try:
        pred = ml_service.predict_one(payload.review_text)
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    cleaned = clean_text(payload.review_text)
    complaint_category = detect_complaint_category(cleaned, pred.predicted_sentiment)

    product = db.query(Product).filter(Product.name == payload.product_name).first()
    if product is None:
        product = Product(name=payload.product_name)
        db.add(product)
        db.flush()

    review_date = payload.review_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    proxy_sentiment = map_rating_to_proxy_sentiment(payload.rating) if payload.rating is not None else None

    review = Review(
        dataset_id=None,
        product_id=product.id,
        review_text=payload.review_text,
        cleaned_text=cleaned,
        rating=payload.rating,
        proxy_sentiment=proxy_sentiment,
        predicted_sentiment=pred.predicted_sentiment,
        confidence=pred.confidence,
        prob_positive=pred.probabilities["Positive"],
        prob_neutral=pred.probabilities["Neutral"],
        prob_negative=pred.probabilities["Negative"],
        complaint_category=complaint_category,
        review_date=review_date,
        source="live",
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    serialized = serialize_review(review, product.name)
    return AnalyzeReviewResponse(**serialized, model_name=pred.model_name)


@router.post(
    "/datasets/preview",
    response_model=DatasetPreviewResponse,
    summary="Inspect an uploaded CSV schema and suggest column mappings before import",
)
async def preview_dataset(file: UploadFile = File(...)) -> DatasetPreviewResponse:
    filename = file.filename or "uploaded.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")
    file_bytes = await file.read()
    try:
        preview = inspect_csv_upload(file_bytes, filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return DatasetPreviewResponse(**preview)


@router.post(
    "/datasets/upload",
    response_model=DatasetUploadResponse,
    summary="Upload, validate, clean, classify, and persist a CSV review dataset",
)
async def upload_dataset(
    file: UploadFile = File(...),
    column_mapping: Optional[str] = Form(
        default=None,
        description="Optional JSON object mapping keys: review_text, rating, product_name, review_date",
    ),
    db: Session = Depends(get_db),
) -> DatasetUploadResponse:
    filename = file.filename or "uploaded.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    parsed_mapping: Optional[dict[str, Optional[str]]] = None
    if column_mapping:
        try:
            parsed_mapping = json.loads(column_mapping)
            if not isinstance(parsed_mapping, dict):
                raise ValueError("column_mapping must be a JSON object.")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid column_mapping JSON: {exc}") from exc

    file_bytes = await file.read()
    try:
        result = process_csv_upload(
            db=db,
            file_bytes=file_bytes,
            filename=filename,
            column_mapping=parsed_mapping,
            source="upload",
        )
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return DatasetUploadResponse(**result)


@router.get("/datasets", response_model=list[DatasetSummary], summary="List uploaded and seeded datasets")
def list_datasets(db: Session = Depends(get_db)) -> list[DatasetSummary]:
    datasets = db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()
    return [
        DatasetSummary(
            id=d.id,
            filename=d.filename,
            source=d.source,
            raw_rows=d.raw_rows,
            valid_rows=d.valid_rows,
            duplicates_removed=d.duplicates_removed,
            missing_removed=d.missing_removed,
            uploaded_at=d.uploaded_at,
        )
        for d in datasets
    ]


@router.get("/reviews", summary="Query classified reviews with filtering, pagination, and optional CSV export")
def list_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    sentiment: Optional[str] = Query(default=None),
    product: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    min_confidence: Optional[float] = Query(default=None, ge=0.0, le=1.0),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    format: str = Query(default="json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
):
    query = db.query(Review, Product.name.label("product_name")).join(
        Product, Review.product_id == Product.id
    )

    if sentiment and sentiment != "ALL":
        query = query.filter(Review.predicted_sentiment == sentiment)
    if product and product != "ALL":
        query = query.filter(Product.name == product)
    if source and source != "ALL":
        query = query.filter(Review.source == source)
    if min_confidence is not None:
        query = query.filter(Review.confidence >= min_confidence)
    if start_date:
        query = query.filter(Review.review_date >= start_date)
    if end_date:
        query = query.filter(Review.review_date <= end_date)
    if search and search.strip():
        like = f"%{search.strip()}%"
        query = query.filter(Review.review_text.ilike(like) | Product.name.ilike(like))

    if format == "csv":
        all_rows = query.order_by(Review.id.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "id",
                "product_name",
                "review_text",
                "rating",
                "proxy_sentiment",
                "predicted_sentiment",
                "confidence",
                "prob_positive",
                "prob_neutral",
                "prob_negative",
                "complaint_category",
                "review_date",
                "source",
            ]
        )
        for rev, p_name in all_rows:
            writer.writerow(
                [
                    rev.id,
                    p_name,
                    rev.review_text,
                    rev.rating if rev.rating is not None else "",
                    rev.proxy_sentiment or "",
                    rev.predicted_sentiment,
                    round(float(rev.confidence), 4),
                    round(float(rev.prob_positive), 4),
                    round(float(rev.prob_neutral), 4),
                    round(float(rev.prob_negative), 4),
                    rev.complaint_category or "",
                    rev.review_date or "",
                    rev.source,
                ]
            )
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=reviewiq_analyzed_reviews.csv"},
        )

    total = query.count()
    offset = (page - 1) * page_size
    rows = query.order_by(Review.id.desc()).offset(offset).limit(page_size).all()
    items = [serialize_review(rev, p_name) for rev, p_name in rows]
    return PaginatedReviewsResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/analytics/overview", summary="Overview dashboard KPIs, trends, top complaints, and recent reviews")
def analytics_overview(db: Session = Depends(get_db)) -> dict[str, Any]:
    return get_overview_analytics(db)


@router.get("/analytics/sentiment", summary="Detailed sentiment analytics with interactive filters")
def analytics_sentiment(
    product: Optional[str] = Query(default=None),
    sentiment: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    min_confidence: Optional[float] = Query(default=None, ge=0.0, le=1.0),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return get_sentiment_analytics(
        db=db,
        product=product,
        sentiment=sentiment,
        source=source,
        min_confidence=min_confidence,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/analytics/complaints", summary="Unsupervised K-Means complaint topic clustering")
def analytics_complaints(
    method: str = Query(default="tfidf", pattern="^(tfidf|sbert)$"),
    k: Optional[int] = Query(default=None, ge=2, le=8),
    product: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return cluster_negative_reviews(
        db=db,
        method=method,
        num_clusters=k,
        product_name=product if product and product != "ALL" else None,
    )


@router.get("/analytics/products", summary="Compare products by volume, sentiment, complaints, and trends")
def analytics_products(
    products: Optional[list[str]] = Query(default=None, description="Product names to compare"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return get_product_comparison(db=db, selected_products=products)


@router.get("/models/metrics", summary="Actual held-out model evaluation metrics and confusion matrix")
def model_metrics() -> dict[str, Any]:
    try:
        return ml_service.load_metrics()
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

