"""Text preprocessing, rating-to-proxy-sentiment mapping, and dataset cleaning."""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import Optional

import pandas as pd

SENTIMENT_LABELS = ["Negative", "Neutral", "Positive"]

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_NON_STANDARD_RE = re.compile(r"[^a-z0-9\s'!?.,-]")
_MULTISPACE_RE = re.compile(r"\s+")


@dataclass
class CleaningReport:
    raw_rows: int
    missing_text_removed: int
    duplicates_removed: int
    invalid_rating_removed: int
    valid_rows: int

    def to_dict(self) -> dict:
        return {
            "raw_rows": self.raw_rows,
            "missing_text_removed": self.missing_text_removed,
            "duplicates_removed": self.duplicates_removed,
            "invalid_rating_removed": self.invalid_rating_removed,
            "valid_rows": self.valid_rows,
        }


def clean_text(text: str | None) -> str:
    """Clean review text while preserving negation cues and sentiment punctuation."""
    if text is None or not isinstance(text, str):
        return ""
    cleaned = html.unescape(text)
    cleaned = _HTML_TAG_RE.sub(" ", cleaned)
    cleaned = _URL_RE.sub(" ", cleaned)
    cleaned = cleaned.lower()
    cleaned = _NON_STANDARD_RE.sub(" ", cleaned)
    cleaned = _MULTISPACE_RE.sub(" ", cleaned).strip()
    return cleaned


def map_rating_to_proxy_sentiment(rating: float | int | str | None) -> Optional[str]:
    """Map 1-5 star ratings to proxy sentiment labels.

    Proxy label convention (NOT verified human sentiment annotations):
      - 1-2 stars -> Negative
      - 3 stars   -> Neutral
      - 4-5 stars -> Positive
    """
    if rating is None or pd.isna(rating):
        return None
    try:
        val = float(rating)
    except (TypeError, ValueError):
        return None
    if val < 1.0 or val > 5.0:
        return None
    rounded = int(round(val))
    if rounded <= 2:
        return "Negative"
    if rounded == 3:
        return "Neutral"
    return "Positive"


def validate_and_clean_dataframe(
    df: pd.DataFrame,
    text_col: str,
    rating_col: Optional[str] = None,
    product_col: Optional[str] = None,
    date_col: Optional[str] = None,
    require_rating: bool = False,
) -> tuple[pd.DataFrame, CleaningReport]:
    """Validate columns, strip missing/empty records, deduplicate, and standardize schema."""
    if text_col not in df.columns:
        raise ValueError(f"Required review text column '{text_col}' not found in dataset.")

    raw_rows = len(df)
    work = pd.DataFrame()
    work["review_text"] = df[text_col].astype(str).where(df[text_col].notna(), "")
    work["cleaned_text"] = work["review_text"].map(clean_text)

    if product_col and product_col in df.columns:
        work["product_name"] = (
            df[product_col]
            .fillna("Unspecified Product")
            .astype(str)
            .str.strip()
            .replace("", "Unspecified Product")
        )
    else:
        work["product_name"] = "Unspecified Product"

    if rating_col and rating_col in df.columns:
        work["rating"] = pd.to_numeric(df[rating_col], errors="coerce")
    else:
        work["rating"] = pd.NA

    if date_col and date_col in df.columns:
        parsed_dates = pd.to_datetime(df[date_col], errors="coerce", utc=False)
        work["review_date"] = parsed_dates.dt.strftime("%Y-%m-%d").where(parsed_dates.notna(), None)
    else:
        work["review_date"] = None

    # 1. Remove missing / too-short text rows
    valid_text_mask = work["cleaned_text"].str.len() >= 3
    missing_text_removed = int((~valid_text_mask).sum())
    work = work[valid_text_mask].copy()

    # 2. Validate ratings if required (e.g., supervised model training)
    invalid_rating_removed = 0
    if require_rating:
        valid_rating_mask = work["rating"].notna() & (work["rating"] >= 1.0) & (work["rating"] <= 5.0)
        invalid_rating_removed = int((~valid_rating_mask).sum())
        work = work[valid_rating_mask].copy()
        work["proxy_sentiment"] = work["rating"].map(map_rating_to_proxy_sentiment)
        work = work[work["proxy_sentiment"].notna()].copy()
    else:
        work["rating"] = work["rating"].where(
            work["rating"].notna() & (work["rating"] >= 1.0) & (work["rating"] <= 5.0),
            None,
        )
        work["proxy_sentiment"] = work["rating"].map(map_rating_to_proxy_sentiment)

    # 3. Remove duplicate reviews (same cleaned text + same product)
    before_dedup = len(work)
    work = work.drop_duplicates(subset=["cleaned_text", "product_name"], keep="first").reset_index(
        drop=True
    )
    duplicates_removed = before_dedup - len(work)

    report = CleaningReport(
        raw_rows=raw_rows,
        missing_text_removed=missing_text_removed,
        duplicates_removed=duplicates_removed,
        invalid_rating_removed=invalid_rating_removed,
        valid_rows=len(work),
    )
    return work, report

