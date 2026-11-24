"""Complaint categorization and unsupervised K-Means topic clustering.

Supports:
  - TF-IDF (1-2 ngrams) + K-Means clustering (fast, deterministic, default)
  - Sentence Transformers ('all-MiniLM-L6-v2') + K-Means clustering (optional semantic enhancement)
"""

from __future__ import annotations

import importlib.util
from typing import Any, Optional

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from sqlalchemy.orm import Session

from app.database.models import Product, Review

# Domain-aligned complaint categories for fast single-review tagging and cluster naming
COMPLAINT_CATEGORY_LEXICON: dict[str, list[str]] = {
    "Cancellation & Billing": [
        "cancel",
        "cancelled",
        "canceled",
        "charge",
        "charged",
        "billing",
        "auto renew",
        "renew",
        "refund",
        "credit card",
        "subscription",
        "unsubscribe",
    ],
    "Shipping & Delivery Delays": [
        "shipping",
        "delivery",
        "late",
        "never arrived",
        "never received",
        "delayed",
        "tracking",
        "arrived",
        "package",
        "damaged box",
        "wait",
        "weeks",
    ],
    "Poor Value & Overpriced": [
        "waste of money",
        "overpriced",
        "not worth",
        "expensive",
        "cheap",
        "ripoff",
        "rip off",
        "dollar store",
        "value",
        "money",
        "price",
        "cost",
    ],
    "Product Quality & Defects": [
        "broken",
        "broke",
        "defective",
        "poor quality",
        "low quality",
        "stale",
        "expired",
        "melted",
        "smell",
        "terrible quality",
        "fell apart",
        "junk",
        "trash",
        "garbage",
    ],
    "Wrong, Missing or Repetitive Items": [
        "missing",
        "wrong",
        "duplicate",
        "same",
        "repeat",
        "repetitive",
        "empty",
        "size",
        "small",
        "tiny",
        "samples",
        "trial size",
    ],
    "Customer Support Issues": [
        "customer service",
        "support",
        "response",
        "email",
        "contact",
        "rude",
        "unhelpful",
        "no reply",
        "ignored",
        "representative",
    ],
}

_SBERT_MODEL_CACHE: Any = None


def is_sentence_transformers_available() -> bool:
    return importlib.util.find_spec("sentence_transformers") is not None


def detect_complaint_category(cleaned_text: str, predicted_sentiment: str) -> Optional[str]:
    """Assign a primary complaint category for Negative reviews using lexical phrase scoring."""
    if predicted_sentiment != "Negative":
        return None

    text_lower = cleaned_text.lower()
    best_cat = "General Product Dissatisfaction"
    best_score = 0

    for category, phrases in COMPLAINT_CATEGORY_LEXICON.items():
        score = 0
        for phrase in phrases:
            if phrase in text_lower:
                # Multi-word phrases carry stronger topical signal
                score += 2 if " " in phrase else 1
        if score > best_score:
            best_score = score
            best_cat = category

    return best_cat


def _label_cluster_from_keywords(keywords: list[str], sample_texts: list[str]) -> str:
    """Derive an interpretable complaint cluster title from top cluster keywords."""
    joined = " ".join(keywords).lower() + " " + " ".join(sample_texts[:5]).lower()
    scores: list[tuple[int, str]] = []
    for category, phrases in COMPLAINT_CATEGORY_LEXICON.items():
        score = sum((3 if p in " ".join(keywords).lower() else 1) for p in phrases if p in joined)
        if score > 0:
            scores.append((score, category))
    if scores:
        scores.sort(key=lambda x: x[0], reverse=True)
        top_label = scores[0][1]
        # Append leading distinctive keyword to distinguish multiple clusters in the same theme
        lead_kw = next((k for k in keywords if len(k) >= 4), "")
        if lead_kw:
            return f"{top_label} ({lead_kw.title()})"
        return top_label
    if keywords:
        return f"Topic: {', '.join(k.title() for k in keywords[:2])}"
    return "General Customer Complaints"


def _compute_sbert_embeddings(texts: list[str]) -> np.ndarray:
    global _SBERT_MODEL_CACHE
    from sentence_transformers import SentenceTransformer  # type: ignore

    if _SBERT_MODEL_CACHE is None:
        _SBERT_MODEL_CACHE = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = _SBERT_MODEL_CACHE.encode(
        texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True
    )
    return np.asarray(embeddings)


def cluster_negative_reviews(
    db: Session,
    method: str = "tfidf",
    num_clusters: Optional[int] = None,
    product_name: Optional[str] = None,
) -> dict[str, Any]:
    """Group negative reviews into recurring complaint topics using K-Means clustering."""
    query = (
        db.query(Review, Product.name.label("product_name"))
        .join(Product, Review.product_id == Product.id)
        .filter(Review.predicted_sentiment == "Negative")
    )
    if product_name:
        query = query.filter(Product.name == product_name)

    rows = query.order_by(Review.id.desc()).all()
    total_negative = len(rows)

    sbert_available = is_sentence_transformers_available()
    requested_method = method.lower().strip()
    active_method = requested_method
    method_note: Optional[str] = None

    if requested_method == "sbert" and not sbert_available:
        active_method = "tfidf"
        method_note = (
            "Sentence Transformers ('sentence-transformers') is not installed in the current Python "
            "environment. Automatically fell back to TF-IDF + K-Means. Install 'sentence-transformers' "
            "to enable dense neural semantic embeddings (all-MiniLM-L6-v2)."
        )
    elif requested_method not in {"tfidf", "sbert"}:
        active_method = "tfidf"

    methodology = {
        "requested_method": requested_method,
        "active_method": active_method,
        "sentence_transformers_available": sbert_available,
        "fallback_notice": method_note,
        "description": (
            "Negative reviews predicted by the trained sentiment classifier are vectorized using "
            + (
                "Sentence Transformers ('all-MiniLM-L6-v2') normalized dense embeddings"
                if active_method == "sbert"
                else "TF-IDF (1-2 word n-grams, English stopwords removed, sublinear TF scaling)"
            )
            + " and partitioned with K-Means clustering (random_state=42, n_init=10). "
            "Cluster keywords are extracted via class-level TF-IDF weights, and representative reviews "
            "are selected by minimum Euclidean distance to each cluster centroid."
        ),
        "limitations": [
            "Unsupervised K-Means forces spherical partitions and assigns every negative review to exactly one cluster even when a review raises multiple complaints.",
            "TF-IDF clustering relies on surface lexical overlap and may separate semantically similar complaints phrased with different vocabulary (mitigated by optional Sentence Transformers).",
            "Cluster topic titles are automatically inferred from top weighted keywords and domain lexicons; manual review is recommended before executive reporting.",
            "Small negative sample sizes (< 20 reviews) reduce cluster stability and silhouette separation.",
        ],
    }

    if total_negative < 5:
        return {
            "total_negative_reviews": total_negative,
            "num_clusters": 0,
            "silhouette_score": None,
            "clusters": [],
            "category_distribution": [],
            "methodology": methodology,
        }

    texts = [r.cleaned_text for r, _ in rows]
    raw_texts = [r.review_text for r, _ in rows]
    products = [p_name for _, p_name in rows]
    confidences = [float(r.confidence) for r, _ in rows]
    review_ids = [int(r.id) for r, _ in rows]
    dates = [r.review_date for r, _ in rows]

    # Always compute TF-IDF matrix for keyword extraction (and default clustering)
    tfidf_vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=3000,
        min_df=2 if total_negative >= 20 else 1,
        max_df=0.85,
        stop_words="english",
        sublinear_tf=True,
    )
    tfidf_matrix = tfidf_vectorizer.fit_transform(texts)
    feature_names = np.asarray(tfidf_vectorizer.get_feature_names_out())

    if active_method == "sbert":
        # Cap embedding batch to most recent 1500 negative reviews for interactive latency
        cluster_features = _compute_sbert_embeddings(raw_texts)
    else:
        cluster_features = tfidf_matrix

    max_k = min(8, max(2, total_negative // 4))
    if num_clusters is not None:
        chosen_k = max(2, min(int(num_clusters), max_k))
        km = KMeans(n_clusters=chosen_k, random_state=42, n_init=10)
        labels = km.fit_predict(cluster_features)
        sil = (
            round(float(silhouette_score(cluster_features, labels, sample_size=min(1000, total_negative), random_state=42)), 4)
            if len(set(labels)) > 1
            else None
        )
    else:
        # Select k in [3..min(6, max_k)] maximizing silhouette score for well-separated complaint topics
        candidate_ks = list(range(min(3, max_k), min(6, max_k) + 1))
        if not candidate_ks:
            candidate_ks = [2]
        best_sil = -1.0
        best_km = None
        best_labels = None
        best_k = candidate_ks[0]

        for k in candidate_ks:
            km_cand = KMeans(n_clusters=k, random_state=42, n_init=10)
            lbl_cand = km_cand.fit_predict(cluster_features)
            if len(set(lbl_cand)) < 2:
                continue
            sil_cand = float(
                silhouette_score(
                    cluster_features,
                    lbl_cand,
                    sample_size=min(1000, total_negative),
                    random_state=42,
                )
            )
            if sil_cand > best_sil:
                best_sil = sil_cand
                best_km = km_cand
                best_labels = lbl_cand
                best_k = k

        if best_km is None:
            best_km = KMeans(n_clusters=candidate_ks[0], random_state=42, n_init=10)
            best_labels = best_km.fit_predict(cluster_features)
            best_sil = 0.0
            best_k = candidate_ks[0]

        km = best_km
        labels = best_labels
        chosen_k = best_k
        sil = round(best_sil, 4)

    # Build cluster summaries
    clusters_out: list[dict[str, Any]] = []
    centroids = km.cluster_centers_

    for cid in range(chosen_k):
        member_indices = np.where(labels == cid)[0]
        if len(member_indices) == 0:
            continue

        # Top keywords from mean TF-IDF vector of cluster members
        cluster_tfidf_mean = np.asarray(tfidf_matrix[member_indices].mean(axis=0)).ravel()
        top_term_idx = np.argsort(cluster_tfidf_mean)[::-1][:8]
        keywords = [str(feature_names[i]) for i in top_term_idx if cluster_tfidf_mean[i] > 0]

        # Representative reviews closest to cluster centroid
        centroid = centroids[cid]
        if active_method == "sbert":
            member_vecs = cluster_features[member_indices]
            dists = np.linalg.norm(member_vecs - centroid, axis=1)
        else:
            member_vecs = tfidf_matrix[member_indices].toarray()
            dists = np.linalg.norm(member_vecs - centroid, axis=1)

        nearest_order = np.argsort(dists)
        rep_reviews = []
        seen_snippets = set()
        for local_idx in nearest_order:
            global_idx = int(member_indices[local_idx])
            snippet = raw_texts[global_idx].strip()
            if snippet[:80] in seen_snippets:
                continue
            seen_snippets.add(snippet[:80])
            rep_reviews.append(
                {
                    "id": review_ids[global_idx],
                    "product_name": products[global_idx],
                    "review_text": snippet[:340] + ("..." if len(snippet) > 340 else ""),
                    "confidence": round(confidences[global_idx], 4),
                    "review_date": dates[global_idx],
                }
            )
            if len(rep_reviews) >= 3:
                break

        sample_for_label = [r["review_text"] for r in rep_reviews]
        cluster_name = _label_cluster_from_keywords(keywords, sample_for_label)
        avg_conf = float(np.mean([confidences[i] for i in member_indices]))

        # Top affected products in this complaint cluster
        prod_counts: dict[str, int] = {}
        for i in member_indices:
            p = products[int(i)]
            prod_counts[p] = prod_counts.get(p, 0) + 1
        top_products = [
            {"product_name": p, "count": c}
            for p, c in sorted(prod_counts.items(), key=lambda x: x[1], reverse=True)[:4]
        ]

        clusters_out.append(
            {
                "cluster_id": int(cid),
                "topic_name": cluster_name,
                "count": int(len(member_indices)),
                "percentage": round(len(member_indices) / total_negative * 100.0, 2),
                "avg_confidence": round(avg_conf, 4),
                "keywords": keywords,
                "top_products": top_products,
                "representative_reviews": rep_reviews,
            }
        )

    clusters_out.sort(key=lambda c: c["count"], reverse=True)

    # Also compute exact category distribution from stored complaint_category tags
    cat_counts: dict[str, int] = {}
    for rev, _ in rows:
        cat = rev.complaint_category or "General Product Dissatisfaction"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    category_distribution = [
        {
            "category": cat,
            "count": cnt,
            "percentage": round(cnt / total_negative * 100.0, 2),
        }
        for cat, cnt in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "total_negative_reviews": total_negative,
        "num_clusters": len(clusters_out),
        "silhouette_score": sil,
        "clusters": clusters_out,
        "category_distribution": category_distribution,
        "methodology": methodology,
    }

