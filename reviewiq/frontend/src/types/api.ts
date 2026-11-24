export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative';

export interface ClassProbabilities {
  Positive: number;
  Neutral: number;
  Negative: number;
}

export interface HealthResponse {
  status: string;
  database_connected: boolean;
  model_loaded: boolean;
  model_name: string | null;
  model_error: string | null;
  metrics_available: boolean;
  sentence_transformers_available: boolean;
  total_reviews: number;
  total_products: number;
  total_datasets: number;
}

export interface ReviewRecord {
  id: number;
  product_name: string;
  review_text: string;
  rating: number | null;
  proxy_sentiment: SentimentLabel | null;
  predicted_sentiment: SentimentLabel;
  confidence: number;
  probabilities: ClassProbabilities;
  complaint_category: string | null;
  review_date: string | null;
  source: string;
  dataset_id: number | null;
  created_at: string;
}

export interface AnalyzeReviewResponse extends ReviewRecord {
  model_name: string;
}

export interface PaginatedReviewsResponse {
  total: number;
  page: number;
  page_size: number;
  items: ReviewRecord[];
}

export interface DatasetPreviewResponse {
  filename: string;
  total_rows: number;
  columns: string[];
  suggested_mapping: Record<string, string | null>;
  sample_rows: Record<string, string>[];
}

export interface DatasetUploadResponse {
  dataset_id: number;
  filename: string;
  raw_rows: number;
  valid_rows: number;
  duplicates_removed: number;
  missing_removed: number;
  sentiment_breakdown: Record<string, number>;
  average_confidence: number;
  model_name: string;
  preview_predictions: ReviewRecord[];
}

export interface DatasetSummary {
  id: number;
  filename: string;
  source: string;
  raw_rows: number;
  valid_rows: number;
  duplicates_removed: number;
  missing_removed: number;
  uploaded_at: string;
}

export interface SentimentDistItem {
  sentiment: SentimentLabel;
  count: number;
  percentage: number;
}

export interface TrendPoint {
  period: string;
  Positive: number;
  Neutral: number;
  Negative: number;
  total: number;
}

export interface ComplaintCategoryCount {
  category: string;
  count: number;
  percentage?: number;
}

export interface OverviewAnalytics {
  total_reviews: number;
  total_products: number;
  total_datasets: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  average_confidence: number;
  sentiment_distribution: SentimentDistItem[];
  sentiment_trends: TrendPoint[];
  top_complaints: ComplaintCategoryCount[];
  recent_reviews: ReviewRecord[];
}

export interface ProductSentimentRow {
  product_name: string;
  total: number;
  Positive: number;
  Neutral: number;
  Negative: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface KeywordFreq {
  keyword: string;
  count: number;
}

export interface SentimentAnalytics {
  total_filtered_reviews: number;
  available_products: string[];
  sentiment_distribution: SentimentDistItem[];
  review_trends: TrendPoint[];
  product_sentiment: ProductSentimentRow[];
  keyword_frequency: {
    overall: KeywordFreq[];
    Positive: KeywordFreq[];
    Negative: KeywordFreq[];
    Neutral: KeywordFreq[];
  };
  confidence_distribution: { bucket: string; count: number }[];
}

export interface ComplaintCluster {
  cluster_id: number;
  topic_name: string;
  count: number;
  percentage: number;
  avg_confidence: number;
  keywords: string[];
  top_products: { product_name: string; count: number }[];
  representative_reviews: {
    id: number;
    product_name: string;
    review_text: string;
    confidence: number;
    review_date: string | null;
  }[];
}

export interface ComplaintAnalytics {
  total_negative_reviews: number;
  num_clusters: number;
  silhouette_score: number | null;
  clusters: ComplaintCluster[];
  category_distribution: ComplaintCategoryCount[];
  methodology: {
    requested_method: string;
    active_method: string;
    sentence_transformers_available: boolean;
    fallback_notice: string | null;
    description: string;
    limitations: string[];
  };
}

export interface ProductComparisonItem {
  product_name: string;
  review_volume: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  avg_rating: number | null;
  avg_confidence: number;
  top_complaints: { category: string; count: number }[];
  trends: TrendPoint[];
  sample_negative_reviews: {
    id: number;
    review_text: string;
    complaint_category: string | null;
    confidence: number;
  }[];
}

export interface ProductComparisonResponse {
  total_products: number;
  available_products: { product_name: string; review_volume: number }[];
  compared_products: ProductComparisonItem[];
}

export interface PerClassMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface ModelEvaluation {
  model_name: string;
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  macro_precision: number;
  macro_recall: number;
  per_class: Record<SentimentLabel, PerClassMetrics>;
  confusion_matrix: {
    labels: SentimentLabel[];
    matrix: number[][];
  };
  confidence_stats: {
    mean_confidence: number | null;
    mean_confidence_correct: number | null;
    mean_confidence_incorrect: number | null;
  };
}

export interface ModelMetricsArtifact {
  selected_model: string;
  selection_criterion: string;
  trained_at: string;
  random_seed: number;
  test_split_ratio: number;
  leakage_prevention: string;
  dataset: {
    name: string;
    source_url: string;
    file: string;
    label_methodology: string;
    cleaning: {
      raw_rows: number;
      missing_text_removed: number;
      duplicates_removed: number;
      invalid_rating_removed: number;
      valid_rows: number;
    };
    train_samples: number;
    test_samples: number;
    total_samples: number;
    unique_products: number;
    class_distribution: {
      train: Record<SentimentLabel, number>;
      test: Record<SentimentLabel, number>;
    };
  };
  selected_metrics: ModelEvaluation;
  model_comparison: ModelEvaluation[];
  limitations: string[];
}

