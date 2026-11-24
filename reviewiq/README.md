# ReviewIQ — Intelligent E-Commerce Review Analysis & Customer Insight System

**ReviewIQ** is a full-stack machine learning web application built for a B.E. CSE (AI&ML) mini-project. It analyzes real e-commerce customer reviews using self-trained scikit-learn sentiment classification pipelines, unsupervised K-Means complaint topic clustering, interactive Recharts visual analytics, and persistent SQLite storage.

> **Strict ML Integrity**: ReviewIQ never invents predictions or metrics. All inference comes directly from joblib-persisted scikit-learn artifacts trained on real e-commerce data, and missing artifacts return explicit `503 Service Unavailable` errors.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons
- **Backend**: Python FastAPI, Uvicorn, Pydantic v2
- **Database**: SQLite + SQLAlchemy 2.0 ORM
- **Machine Learning**: Scikit-learn (`TfidfVectorizer`, `LogisticRegression`, `LinearSVC` + `CalibratedClassifierCV`, `KMeans`), Pandas, NumPy, Joblib
- **Optional Advanced ML**: Sentence Transformers (`all-MiniLM-L6-v2`) for dense semantic complaint clustering

---

## Project Structure

```text
reviewiq/
├── frontend/
│   └── src/
│       ├── components/   # Layout, GlassCard, StatCard, SentimentBadge, ModelErrorBanner
│       ├── pages/        # Landing, Overview, Live Analyzer, Dataset Upload, Sentiment Analytics,
│       │                 # Complaint Intelligence, Product Comparison, Model Performance
│       ├── services/     # Typed FastAPI client
│       ├── hooks/        # useApi data hook
│       └── types/        # TypeScript API contracts
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI app, CORS, lifespan init
│   │   ├── config.py     # Environment-configurable paths
│   │   ├── api/          # REST endpoints (/api/*)
│   │   ├── database/     # SQLAlchemy engine & ORM models
│   │   ├── models/       # Pydantic request/response schemas
│   │   └── services/     # Real ML inference, complaint clustering, CSV pipeline, SQL analytics
│   ├── ml/
│   │   ├── download_dataset.py  # Downloads public Amazon Reviews 2023 dataset
│   │   ├── preprocessing.py     # Text cleaning, deduplication, proxy-label mapping
│   │   ├── train.py             # Leak-free stratified split, LogReg vs SVM comparison, joblib export
│   │   ├── evaluate.py          # Held-out accuracy, macro F1, per-class metrics, confusion matrix
│   │   └── seed_db.py           # Optional real-model initial SQLite seed
│   ├── artifacts/
│   │   ├── sentiment_model.joblib
│   │   └── model_metrics.json
│   └── requirements.txt
├── data/
│   ├── amazon_reviews_2023_subscription_boxes.csv
│   └── sample_upload_reviews.csv
├── README.md
└── .gitignore
```

---

## Dataset & Labeling Methodology

- **Dataset**: [Amazon Reviews 2023 — Subscription Boxes (McAuley Lab, UCSD)](https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023)
- **Records**: 16,216 raw reviews (200 most recent reviews reserved into `data/sample_upload_reviews.csv` with alternate headers `Comment, Stars, Item, Date` for testing CSV upload & column mapping; 16,016 main rows cleaned to **15,794 valid unique reviews** across 493 products).
- **Proxy Sentiment Labels** *(explicitly documented as rating-derived proxy labels, not verified human sentiment annotations)*:
  - **1–2 stars** → `Negative`
  - **3 stars** → `Neutral`
  - **4–5 stars** → `Positive`
- **Leakage Prevention**: Stratified 80/20 train/test split (`12,635` train / `3,159` held-out test, `random_state=42`) is performed **before** TF-IDF vectorization; vectorizers fit exclusively inside scikit-learn `Pipeline` objects on training rows.

### Held-Out Test Evaluation Results

| Model | Accuracy | Macro F1 | Weighted F1 | Macro Precision | Macro Recall | Selected |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **TF-IDF + Logistic Regression** (`class_weight='balanced'`) | **82.21%** | **0.7025** | **0.8304** | **0.6930** | **0.7170** | **Yes (Best Macro F1)** |
| TF-IDF + Calibrated Linear SVM | 84.27% | 0.6535 | 0.8218 | 0.6973 | 0.6560 | No |

*Why Macro F1?* On imbalanced 3-class e-commerce reviews (where 3-star Neutral reviews are the smallest and most ambiguous class), Accuracy favors majority-class predictions while Macro F1 rewards balanced recall across Negative, Neutral, and Positive classes.

---

## Setup & Installation

### 1. Backend Setup & Model Training

```bash
cd reviewiq/backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt

# Optional: enable Sentence Transformers semantic clustering
# pip install sentence-transformers

# Download public Amazon Reviews 2023 dataset, clean, train, evaluate & export artifacts
python -m ml.train

# Optional: seed SQLite with 1,200 real ML-classified reviews for immediate dashboard exploration
python -m ml.seed_db

# Start FastAPI server (auto-docs at http://127.0.0.1:8000/docs)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd reviewiq/frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in your browser. Vite proxies `/api/*` requests directly to `http://127.0.0.1:8000`.

---

## Backend API Documentation

Interactive Swagger UI is automatically served at `http://127.0.0.1:8000/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System, SQLite, and ML model artifact readiness status |
| `POST` | `/api/reviews/analyze` | Predict 3-class sentiment, probabilities, confidence & complaint category; persist to SQLite |
| `POST` | `/api/datasets/preview` | Parse CSV headers, suggest column mappings, and return sample rows |
| `POST` | `/api/datasets/upload` | Validate, clean, deduplicate, batch-classify CSV reviews with trained model, and persist |
| `GET` | `/api/datasets` | List all uploaded/seeded datasets with cleaning statistics |
| `GET` | `/api/reviews` | Paginated, searchable, filterable reviews (`?format=csv` downloads filtered CSV export) |
| `GET` | `/api/analytics/overview` | Total counts, sentiment distribution, time trends, top complaints, recent reviews |
| `GET` | `/api/analytics/sentiment` | Filtered sentiment distribution, trends, product breakdown, keyword frequency, confidence histogram |
| `GET` | `/api/analytics/complaints` | Unsupervised K-Means complaint clustering (`?method=tfidf\|sbert&k=auto\|3..8`) + limitations |
| `GET` | `/api/analytics/products` | Multi-product comparison on volume, sentiment %, complaints, ratings & trends |
| `GET` | `/api/models/metrics` | Actual held-out test metrics, algorithm comparison, confusion matrix & limitations |

