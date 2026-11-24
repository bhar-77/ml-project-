"""Real SQL/data-driven analytics aggregations for Overview, Sentiment, and Product Comparison."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Optional

from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sqlalchemy.orm import Session

from app.database.models import Dataset, Product, Review

_EXTRA_STOPWORDS = {
    "box",
    "boxes",
    "subscription",
    "month",
    "monthly",
    "item",
    "items",
    "really",
    "just",
    "like",
    "got",
    "get",
    "one",
    "would",
    "also",
    "even",
    "much",
    "still",
    "back",
    "make",
    "every",
    "first",
    "received",
    "amazon",
    "product",
    "products",
    "thing",
    "things",
}
_STOPWORDS = set(ENGLISH_STOP_WORDS).union(_EXTRA_STOPWORDS)


def _month_bucket(review: Review) -> str:
    if review.review_date and len(review.review_date) >= 7:
        return review.review_date[:7]
    if review.created_at:
        return review.created_at.strftime("%Y-%m")
    return "Unknown"


def _extract_top_keywords(texts: list[str], top_n: int = 12) -> list[dict[str, Any]]:
    counter: Counter[str] = Counter()
    for txt in texts:
        tokens = [
            tok.strip(".,!?'\"-")
            for tok in txt.lower().split()
        ]
        valid = [
            t for t in tokens
            if len(t) >= 3 and t.isalpha() and t not in _STOPWORDS
        ]
        counter.update(valid)
    return [{"keyword": kw, "count": int(cnt)} for kw, cnt in counter.most_common(top_n)]


def serialize_review(review: Review, product_name: str) -> dict[str, Any]:
    return {
        "id": review.id,
        "product_name": product_name,
        "review_text": review.review_text,
        "rating": review.rating,
        "proxy_sentiment": review.proxy_sentiment,
        "predicted_sentiment": review.predicted_sentiment,
        "confidence": round(float(review.confidence), 4),
        "probabilities": {
            "Positive": round(float(review.prob_positive), 4),
            "Neutral": round(float(review.prob_neutral), 4),
            "Negative": round(float(review.prob_negative), 4),
        },
        "complaint_category": review.complaint_category,
        "review_date": review.review_date,
        "source": review.source,
        "dataset_id": review.dataset_id,
        "created_at": review.created_at,
    }


def get_overview_analytics(db: Session) -> dict[str, Any]:
    rows = (
        db.query(Review, Product.name.label("product_name"))
        .join(Product, Review.product_id == Product.id)
        .order_by(Review.id.desc())
        .all()
    )
    total = len(rows)
    total_products = db.query(Product).count()
    total_datasets = db.query(Dataset).count()

    if total == 0:
        return {
            "total_reviews": 0,
            "total_products": total_products,
            "total_datasets": total_datasets,
            "positive_count": 0,
            "neutral_count": 0,
            "negative_count": 0,
            "positive_pct": 0.0,
            "neutral_pct": 0.0,
            "negative_pct": 0.0,
            "average_confidence": 0.0,
            "sentiment_distribution": [
                {"sentiment": "Positive", "count": 0, "percentage": 0.0},
                {"sentiment": "Neutral", "count": 0, "percentage": 0.0},
                {"sentiment": "Negative", "count": 0, "percentage": 0.0},
            ],
            "sentiment_trends": [],
            "top_complaints": [],
            "recent_reviews": [],
        }

    counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    conf_sum = 0.0
    trend_buckets: dict[str, dict[str, int]] = defaultdict(
        lambda: {"Positive": 0, "Neutral": 0, "Negative": 0, "total": 0}
    )
    complaint_counts: Counter[str] = Counter()

    for rev, _ in rows:
        s = rev.predicted_sentiment
        counts[s] = counts.get(s, 0) + 1
        conf_sum += float(rev.confidence)

        bucket = _month_bucket(rev)
        trend_buckets[bucket][s] += 1
        trend_buckets[bucket]["total"] += 1

        if s == "Negative" and rev.complaint_category:
            complaint_counts[rev.complaint_category] += 1

    trends = [
        {"period": period, **vals}
        for period, vals in sorted(trend_buckets.items(), key=lambda x: x[0])
        if period != "Unknown"
    ][-18:]

    neg_total = max(1, counts["Negative"])
    top_complaints = [
        {
            "category": cat,
            "count": int(cnt),
            "percentage": round(cnt / neg_total * 100.0, 2),
        }
        for cat, cnt in complaint_counts.most_common(6)
    ]

    recent_reviews = [serialize_review(rev, p_name) for rev, p_name in rows[:10]]

    return {
        "total_reviews": total,
        "total_products": total_products,
        "total_datasets": total_datasets,
        "positive_count": counts["Positive"],
        "neutral_count": counts["Neutral"],
        "negative_count": counts["Negative"],
        "positive_pct": round(counts["Positive"] / total * 100.0, 2),
        "neutral_pct": round(counts["Neutral"] / total * 100.0, 2),
        "negative_pct": round(counts["Negative"] / total * 100.0, 2),
        "average_confidence": round(conf_sum / total, 4),
        "sentiment_distribution": [
            {
                "sentiment": s,
                "count": counts[s],
                "percentage": round(counts[s] / total * 100.0, 2),
            }
            for s in ("Positive", "Neutral", "Negative")
        ],
        "sentiment_trends": trends,
        "top_complaints": top_complaints,
        "recent_reviews": recent_reviews,
    }


def get_sentiment_analytics(
    db: Session,
    product: Optional[str] = None,
    sentiment: Optional[str] = None,
    source: Optional[str] = None,
    min_confidence: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict[str, Any]:
    query = db.query(Review, Product.name.label("product_name")).join(
        Product, Review.product_id == Product.id
    )

    if product and product != "ALL":
        query = query.filter(Product.name == product)
    if sentiment and sentiment != "ALL":
        query = query.filter(Review.predicted_sentiment == sentiment)
    if source and source != "ALL":
        query = query.filter(Review.source == source)
    if min_confidence is not None:
        query = query.filter(Review.confidence >= min_confidence)
    if start_date:
        query = query.filter(Review.review_date >= start_date)
    if end_date:
        query = query.filter(Review.review_date <= end_date)

    rows = query.order_by(Review.id.desc()).all()
    total = len(rows)

    all_products = [p.name for p in db.query(Product).order_by(Product.name.asc()).all()]

    counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    trends_map: dict[str, dict[str, int]] = defaultdict(
        lambda: {"Positive": 0, "Neutral": 0, "Negative": 0, "total": 0}
    )
    prod_map: dict[str, dict[str, int]] = defaultdict(
        lambda: {"Positive": 0, "Neutral": 0, "Negative": 0, "total": 0}
    )
    texts_by_sentiment: dict[str, list[str]] = {"Positive": [], "Neutral": [], "Negative": []}
    all_texts: list[str] = []

    conf_bins = [
        ("0.30-0.50", 0.30, 0.50),
        ("0.50-0.60", 0.50, 0.60),
        ("0.60-0.70", 0.60, 0.70),
        ("0.70-0.80", 0.70, 0.80),
        ("0.80-0.90", 0.80, 0.90),
        ("0.90-1.00", 0.90, 1.01),
    ]
    bin_counts = {label: 0 for label, _, _ in conf_bins}

    for rev, p_name in rows:
        s = rev.predicted_sentiment
        counts[s] = counts.get(s, 0) + 1
        bucket = _month_bucket(rev)
        trends_map[bucket][s] += 1
        trends_map[bucket]["total"] += 1

        prod_map[p_name][s] += 1
        prod_map[p_name]["total"] += 1

        texts_by_sentiment[s].append(rev.cleaned_text)
        all_texts.append(rev.cleaned_text)

        c = float(rev.confidence)
        placed = False
        for label, lo, hi in conf_bins:
            if lo <= c < hi:
                bin_counts[label] += 1
                placed = True
                break
        if not placed:
            bin_counts["0.30-0.50"] += 1

    trends = [
        {"period": period, **vals}
        for period, vals in sorted(trends_map.items(), key=lambda x: x[0])
        if period != "Unknown"
    ][-24:]

    product_sentiment = []
    for p_name, vals in sorted(prod_map.items(), key=lambda x: x[1]["total"], reverse=True)[:12]:
        t = max(1, vals["total"])
        product_sentiment.append(
            {
                "product_name": p_name,
                "total": vals["total"],
                "Positive": vals["Positive"],
                "Neutral": vals["Neutral"],
                "Negative": vals["Negative"],
                "positive_pct": round(vals["Positive"] / t * 100.0, 1),
                "neutral_pct": round(vals["Neutral"] / t * 100.0, 1),
                "negative_pct": round(vals["Negative"] / t * 100.0, 1),
            }
        )

    return {
        "total_filtered_reviews": total,
        "available_products": all_products,
        "sentiment_distribution": [
            {
                "sentiment": s,
                "count": counts[s],
                "percentage": round(counts[s] / total * 100.0, 2) if total else 0.0,
            }
            for s in ("Positive", "Neutral", "Negative")
        ],
        "review_trends": trends,
        "product_sentiment": product_sentiment,
        "keyword_frequency": {
            "overall": _extract_top_keywords(all_texts, top_n=14),
            "Positive": _extract_top_keywords(texts_by_sentiment["Positive"], top_n=10),
            "Negative": _extract_top_keywords(texts_by_sentiment["Negative"], top_n=10),
            "Neutral": _extract_top_keywords(texts_by_sentiment["Neutral"], top_n=10),
        },
        "confidence_distribution": [
            {"bucket": label, "count": bin_counts[label]} for label, _, _ in conf_bins
        ],
    }


def get_product_comparison(
    db: Session,
    selected_products: Optional[list[str]] = None,
) -> dict[str, Any]:
    rows = (
        db.query(Review, Product.name.label("product_name"))
        .join(Product, Review.product_id == Product.id)
        .all()
    )

    grouped: dict[str, list[Review]] = defaultdict(list)
    for rev, p_name in rows:
        grouped[p_name].append(rev)

    all_product_stats: list[dict[str, Any]] = []
    for p_name, revs in grouped.items():
        total = len(revs)
        pos = sum(1 for r in revs if r.predicted_sentiment == "Positive")
        neu = sum(1 for r in revs if r.predicted_sentiment == "Neutral")
        neg = sum(1 for r in revs if r.predicted_sentiment == "Negative")
        ratings = [float(r.rating) for r in revs if r.rating is not None]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None
        avg_conf = round(sum(float(r.confidence) for r in revs) / total, 4)

        complaints = Counter(
            r.complaint_category or "General Product Dissatisfaction"
            for r in revs
            if r.predicted_sentiment == "Negative"
        )
        top_complaints = [
            {"category": cat, "count": int(cnt)} for cat, cnt in complaints.most_common(4)
        ]

        # Monthly trend per product
        trend_map: dict[str, dict[str, int]] = defaultdict(
            lambda: {"total": 0, "Positive": 0, "Neutral": 0, "Negative": 0}
        )
        for r in revs:
            b = _month_bucket(r)
            if b != "Unknown":
                trend_map[b]["total"] += 1
                trend_map[b][r.predicted_sentiment] += 1

        trends = [
            {"period": period, **vals}
            for period, vals in sorted(trend_map.items(), key=lambda x: x[0])
        ][-12:]

        sample_negatives = [
            {
                "id": r.id,
                "review_text": r.review_text[:240] + ("..." if len(r.review_text) > 240 else ""),
                "complaint_category": r.complaint_category,
                "confidence": round(float(r.confidence), 4),
            }
            for r in sorted(
                [x for x in revs if x.predicted_sentiment == "Negative"],
                key=lambda x: x.confidence,
                reverse=True,
            )[:3]
        ]

        all_product_stats.append(
            {
                "product_name": p_name,
                "review_volume": total,
                "positive_count": pos,
                "neutral_count": neu,
                "negative_count": neg,
                "positive_pct": round(pos / total * 100.0, 2),
                "neutral_pct": round(neu / total * 100.0, 2),
                "negative_pct": round(neg / total * 100.0, 2),
                "avg_rating": avg_rating,
                "avg_confidence": avg_conf,
                "top_complaints": top_complaints,
                "trends": trends,
                "sample_negative_reviews": sample_negatives,
            }
        )

    all_product_stats.sort(key=lambda x: x["review_volume"], reverse=True)

    if selected_products:
        selected_set = set(selected_products)
        compared = [p for p in all_product_stats if p["product_name"] in selected_set]
    else:
        compared = all_product_stats[:4]

    return {
        "total_products": len(all_product_stats),
        "available_products": [
            {"product_name": p["product_name"], "review_volume": p["review_volume"]}
            for p in all_product_stats
        ],
        "compared_products": compared,
    }

