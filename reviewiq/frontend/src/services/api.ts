import type {
  AnalyzeReviewResponse,
  ComplaintAnalytics,
  DatasetPreviewResponse,
  DatasetSummary,
  DatasetUploadResponse,
  HealthResponse,
  ModelMetricsArtifact,
  OverviewAnalytics,
  PaginatedReviewsResponse,
  ProductComparisonResponse,
  SentimentAnalytics,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        message = body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ');
      }
    } catch {
      // keep default message
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),

  analyzeReview: (payload: {
    review_text: string;
    product_name?: string;
    rating?: number | null;
    review_date?: string | null;
  }) =>
    request<AnalyzeReviewResponse>('/reviews/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  previewDataset: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<DatasetPreviewResponse>('/datasets/preview', {
      method: 'POST',
      body: form,
    });
  },

  uploadDataset: (file: File, columnMapping?: Record<string, string | null>) => {
    const form = new FormData();
    form.append('file', file);
    if (columnMapping) {
      form.append('column_mapping', JSON.stringify(columnMapping));
    }
    return request<DatasetUploadResponse>('/datasets/upload', {
      method: 'POST',
      body: form,
    });
  },

  getDatasets: () => request<DatasetSummary[]>('/datasets'),

  getReviews: (params: {
    page?: number;
    page_size?: number;
    sentiment?: string;
    product?: string;
    source?: string;
    search?: string;
    min_confidence?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        qs.set(k, String(v));
      }
    });
    return request<PaginatedReviewsResponse>(`/reviews?${qs.toString()}`);
  },

  getReviewsCsvUrl: (params: {
    sentiment?: string;
    product?: string;
    source?: string;
    search?: string;
    min_confidence?: number;
  }) => {
    const qs = new URLSearchParams({ format: 'csv' });
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        qs.set(k, String(v));
      }
    });
    return `${API_BASE}/reviews?${qs.toString()}`;
  },

  getOverview: () => request<OverviewAnalytics>('/analytics/overview'),

  getSentimentAnalytics: (params: {
    product?: string;
    sentiment?: string;
    source?: string;
    min_confidence?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        qs.set(k, String(v));
      }
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<SentimentAnalytics>(`/analytics/sentiment${suffix}`);
  },

  getComplaintAnalytics: (params: { method?: 'tfidf' | 'sbert'; k?: number | null; product?: string }) => {
    const qs = new URLSearchParams();
    if (params.method) qs.set('method', params.method);
    if (params.k) qs.set('k', String(params.k));
    if (params.product && params.product !== 'ALL') qs.set('product', params.product);
    return request<ComplaintAnalytics>(`/analytics/complaints?${qs.toString()}`);
  },

  getProductComparison: (products?: string[]) => {
    const qs = new URLSearchParams();
    (products || []).forEach((p) => qs.append('products', p));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<ProductComparisonResponse>(`/analytics/products${suffix}`);
  },

  getModelMetrics: () => request<ModelMetricsArtifact>('/models/metrics'),
};

