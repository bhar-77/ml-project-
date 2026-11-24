"""Download and prepare the public Amazon Reviews 2023 (Subscription Boxes) dataset.

Dataset source: McAuley-Lab/Amazon-Reviews-2023 (Hou et al., 2024) on Hugging Face.
https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023

Produces:
- data/amazon_reviews_2023_subscription_boxes.csv  (main training & evaluation dataset)
- data/sample_upload_reviews.csv                   (held-out unseen reviews with alternate headers for CSV upload testing)
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REVIEWS_URL = (
    "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/"
    "resolve/main/raw/review_categories/Subscription_Boxes.jsonl"
)
META_URL = (
    "https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/"
    "resolve/main/raw/meta_categories/meta_Subscription_Boxes.jsonl"
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
MAIN_CSV = DATA_DIR / "amazon_reviews_2023_subscription_boxes.csv"
SAMPLE_UPLOAD_CSV = DATA_DIR / "sample_upload_reviews.csv"


def _download_file(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"[download] Using cached file: {dest}")
        return dest
    print(f"[download] Downloading {url} -> {dest}")
    req = urllib.request.Request(url, headers={"User-Agent": "ReviewIQ/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            out.write(chunk)
    print(f"[download] Saved {dest.stat().st_size:,} bytes")
    return dest


def _clean_product_title(raw_title: str | None, fallback_asin: str) -> str:
    if not raw_title or not isinstance(raw_title, str):
        return f"Product {fallback_asin}"
    title = re.sub(r"\s+", " ", raw_title).strip()
    # Shorten overly verbose Amazon SEO titles while keeping brand/product name clear
    for sep in [" | ", " – ", " - ", ", "]:
        if len(title) > 58 and sep in title:
            candidate = title.split(sep)[0].strip()
            if len(candidate) >= 12:
                title = candidate
                break
    if len(title) > 64:
        title = title[:61].rstrip() + "..."
    return title


def prepare_dataset() -> tuple[Path, Path]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    reviews_path = _download_file(REVIEWS_URL, RAW_DIR / "Subscription_Boxes.jsonl")
    meta_path = _download_file(META_URL, RAW_DIR / "meta_Subscription_Boxes.jsonl")

    asin_to_title: dict[str, str] = {}
    with meta_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            asin = item.get("parent_asin") or item.get("asin")
            if asin:
                asin_to_title[asin] = _clean_product_title(item.get("title"), asin)

    rows: list[dict] = []
    with reviews_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            rating = rec.get("rating")
            title = (rec.get("title") or "").strip()
            body = (rec.get("text") or "").strip()
            if title and body and title.lower() not in body.lower():
                full_text = f"{title}. {body}"
            else:
                full_text = body or title

            ts_ms = rec.get("timestamp")
            review_date = ""
            if isinstance(ts_ms, (int, float)) and ts_ms > 0:
                dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
                review_date = dt.strftime("%Y-%m-%d")

            parent_asin = rec.get("parent_asin") or rec.get("asin") or "UNKNOWN"
            product_name = asin_to_title.get(parent_asin, f"Product {parent_asin}")

            rows.append(
                {
                    "review_text": full_text,
                    "rating": rating,
                    "product_name": product_name,
                    "review_date": review_date,
                    "verified_purchase": bool(rec.get("verified_purchase", False)),
                    "helpful_vote": int(rec.get("helpful_vote", 0) or 0),
                }
            )

    df = pd.DataFrame(rows)
    print(f"[prepare] Parsed {len(df):,} raw review records from Amazon Reviews 2023")

    # Sort deterministically by date, then reserve the most recent 200 valid rows
    # as an unseen sample upload dataset with alternate column headers for UI testing
    df_valid_dates = df[df["review_date"] != ""].sort_values("review_date")
    sample_indices = df_valid_dates.tail(200).index
    sample_df = df.loc[sample_indices].copy()
    main_df = df.drop(index=sample_indices).copy()

    main_df.to_csv(MAIN_CSV, index=False)

    upload_demo_df = pd.DataFrame(
        {
            "Comment": sample_df["review_text"],
            "Stars": sample_df["rating"],
            "Item": sample_df["product_name"],
            "Date": sample_df["review_date"],
        }
    )
    upload_demo_df.to_csv(SAMPLE_UPLOAD_CSV, index=False)

    print(f"[prepare] Saved main dataset ({len(main_df):,} rows) -> {MAIN_CSV}")
    print(f"[prepare] Saved unseen sample upload CSV ({len(upload_demo_df):,} rows) -> {SAMPLE_UPLOAD_CSV}")
    return MAIN_CSV, SAMPLE_UPLOAD_CSV


if __name__ == "__main__":
    prepare_dataset()

