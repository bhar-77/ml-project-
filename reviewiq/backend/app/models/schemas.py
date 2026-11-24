"""Pydantic schemas for ReviewIQ API contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    model_loaded: bool
    model_name: Optional[str] = None
    model_error: Optional[str] = None
    metrics_available: bool
    sentence_transformers_available: bool
    total_reviews: int
    total_products: int
    total_datasets: int


class AnalyzeReviewRequest(BaseModel):
    review_text: str = Field(..., min_length=3, max_length=10000, description="Customer review text to analyze")
    product_name: Optional[str] = Field(
        default="Unspecified Product",
        max_length=255,
        description="Optional product name associated with the review",
    )
    rating: Optional[float] = Field(default=None, ge=1.0, le=5.0, description="Optional 1-5 star rating")
    review_date: Optional[str] = Field(default=None, description="Optional YYYY-MM-DD review date")

    @field_validator("review_text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("Review text must contain at least 3 non-whitespace characters.")
        return cleaned

    @field_validator("product_name")
    @classmethod
    def default_product(cls, v: Optional[str]) -> str:
        if not v or not v.strip():
            return "Unspecified Product"
        return v.strip()


class ClassProbabilities(BaseModel):
    Positive: float
    Neutral: float
    Negative: float


class ReviewRecordResponse(BaseModel):
    id: int
    product_name: str
    review_text: str
    rating: Optional[float] = None
    proxy_sentiment: Optional[str] = None
    predicted_sentiment: str
    confidence: float
    probabilities: ClassProbabilities
    complaint_category: Optional[str] = None
    review_date: Optional[str] = None
    source: str
    dataset_id: Optional[int] = None
    created_at: datetime


class AnalyzeReviewResponse(ReviewRecordResponse):
    model_name: str


class PaginatedReviewsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ReviewRecordResponse]


class DatasetPreviewResponse(BaseModel):
    filename: str
    total_rows: int
    columns: list[str]
    suggested_mapping: dict[str, Optional[str]]
    sample_rows: list[dict[str, Any]]


class DatasetUploadResponse(BaseModel):
    dataset_id: int
    filename: str
    raw_rows: int
    valid_rows: int
    duplicates_removed: int
    missing_removed: int
    sentiment_breakdown: dict[str, int]
    average_confidence: float
    model_name: str
    preview_predictions: list[ReviewRecordResponse]


class DatasetSummary(BaseModel):
    id: int
    filename: str
    source: str
    raw_rows: int
    valid_rows: int
    duplicates_removed: int
    missing_removed: int
    uploaded_at: datetime

