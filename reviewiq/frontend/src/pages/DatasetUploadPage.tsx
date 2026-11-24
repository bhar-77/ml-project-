import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useApi } from '../hooks/useApi';
import type { DatasetPreviewResponse, DatasetUploadResponse } from '../types/api';
import { GlassCard } from '../components/GlassCard';
import { SentimentBadge } from '../components/SentimentBadge';
import { ModelErrorBanner } from '../components/ModelErrorBanner';

export function DatasetUploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DatasetPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({
    review_text: null,
    rating: null,
    product_name: null,
    review_date: null,
  });
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<DatasetUploadResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: datasets, refetch: refetchDatasets } = useApi(() => api.getDatasets(), []);

  async function handleFileSelected(file: File) {
    setError(null);
    setUploadResult(null);
    setSelectedFile(file);
    setLoadingPreview(true);
    try {
      const prev = await api.previewDataset(file);
      setPreview(prev);
      setMapping({
        review_text: prev.suggested_mapping.review_text ?? null,
        rating: prev.suggested_mapping.rating ?? null,
        product_name: prev.suggested_mapping.product_name ?? null,
        review_date: prev.suggested_mapping.review_date ?? null,
      });
    } catch (err) {
      setPreview(null);
      if (err instanceof ApiError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to parse CSV file.');
      }
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    if (!mapping.review_text) {
      setError('Please map a column to Review Text before running classification.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadDataset(selectedFile, mapping);
      setUploadResult(res);
      refetchDatasets();
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Dataset classification failed.');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ModelErrorBanner title="CSV Upload Error" message={error} />}

      {/* Upload Dropzone */}
      <GlassCard
        title="Upload E-Commerce Review Dataset (CSV)"
        subtitle="Supports arbitrary column schemas with automatic detection, deduplication, validation, and batch ML inference"
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileSelected(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-white/15 bg-[#060B18]/65 hover:border-blue-400/45 hover:bg-white/[0.03]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelected(f);
            }}
          />
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/15 p-3.5 text-blue-400">
            {loadingPreview ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </div>
          <p className="mt-4 text-sm font-semibold text-white">
            {selectedFile ? selectedFile.name : 'Drag & drop a CSV file here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Expected fields: review text (required), star rating, product name, and review date (all mappable)
          </p>
        </div>
      </GlassCard>

      {/* Step 2: Column Mapping & Raw Preview */}
      {preview && (
        <GlassCard
          title="Schema Mapping & Import Preview"
          subtitle={`Detected ${preview.total_rows.toLocaleString()} raw rows across ${preview.columns.length} columns in ${preview.filename}`}
          action={
            <button
              type="button"
              disabled={uploading || !mapping.review_text}
              onClick={handleUpload}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cleaning & Classifying...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Clean & Classify Reviews
                </>
              )}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: 'review_text', label: 'Review Text *', required: true },
              { key: 'rating', label: 'Star Rating (1–5)', required: false },
              { key: 'product_name', label: 'Product Name', required: false },
              { key: 'review_date', label: 'Review Date', required: false },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  {field.label}
                </label>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [field.key]: e.target.value || null,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#060B18] px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
                >
                  <option value="">{field.required ? '-- Select column --' : '-- None / Auto --'}</option>
                  {preview.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Raw Preview Table */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  {preview.columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3.5 py-2.5 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {preview.sample_rows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    {preview.columns.map((col) => (
                      <td
                        key={col}
                        className="max-w-[260px] truncate px-3.5 py-2.5 text-slate-300"
                        title={row[col]}
                      >
                        {row[col] || <span className="text-slate-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Classification Result Summary */}
      {uploadResult && (
        <GlassCard
          title="Import & ML Classification Complete"
          subtitle={`Persisted as Dataset #${uploadResult.dataset_id} using ${uploadResult.model_name}`}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <p className="text-[11px] text-slate-400">Raw Rows</p>
              <p className="mt-1 text-xl font-bold text-white tabular-nums">
                {uploadResult.raw_rows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
              <p className="text-[11px] text-emerald-300">Valid Classified</p>
              <p className="mt-1 text-xl font-bold text-white tabular-nums">
                {uploadResult.valid_rows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3.5">
              <p className="text-[11px] text-amber-300">Duplicates Removed</p>
              <p className="mt-1 text-xl font-bold text-white tabular-nums">
                {uploadResult.duplicates_removed.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.07] p-3.5">
              <p className="text-[11px] text-rose-300">Missing Removed</p>
              <p className="mt-1 text-xl font-bold text-white tabular-nums">
                {uploadResult.missing_removed.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3.5">
              <p className="text-[11px] text-blue-300">Avg Confidence</p>
              <p className="mt-1 text-xl font-bold text-white tabular-nums">
                {(uploadResult.average_confidence * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Sentiment Breakdown */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Positive: <strong>{uploadResult.sentiment_breakdown.Positive ?? 0}</strong>
            </span>
            <span className="text-amber-300">
              Neutral: <strong>{uploadResult.sentiment_breakdown.Neutral ?? 0}</strong>
            </span>
            <span className="text-rose-300">
              Negative: <strong>{uploadResult.sentiment_breakdown.Negative ?? 0}</strong>
            </span>
          </div>

          {/* Classified Preview Rows */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3.5 py-2.5">Product</th>
                  <th className="px-3.5 py-2.5">Review</th>
                  <th className="px-3.5 py-2.5">Predicted</th>
                  <th className="px-3.5 py-2.5">Confidence</th>
                  <th className="px-3.5 py-2.5">Complaint Topic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {uploadResult.preview_predictions.map((rev) => (
                  <tr key={rev.id} className="hover:bg-white/[0.02]">
                    <td className="max-w-[180px] truncate px-3.5 py-2.5 font-medium text-white">
                      {rev.product_name}
                    </td>
                    <td className="max-w-[340px] truncate px-3.5 py-2.5 text-slate-300">
                      {rev.review_text}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <SentimentBadge sentiment={rev.predicted_sentiment} size="xs" />
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-200">
                      {(rev.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-3.5 py-2.5 text-rose-300/85">
                      {rev.complaint_category ?? <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Dataset Persistence Ledger */}
      <GlassCard
        title="Persisted Datasets in SQLite"
        subtitle="All uploaded and seeded datasets survive server restarts"
      >
        {!datasets || datasets.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">No datasets recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Raw</th>
                  <th className="px-4 py-3">Valid Classified</th>
                  <th className="px-4 py-3">Cleaned (Dup/Null)</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-slate-400">#{ds.id}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      <span className="inline-flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                        {ds.filename}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                        <Database className="h-3 w-3 text-blue-400" />
                        {ds.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{ds.raw_rows.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-300">
                      {ds.valid_rows.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {ds.duplicates_removed} / {ds.missing_removed}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {new Date(ds.uploaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

