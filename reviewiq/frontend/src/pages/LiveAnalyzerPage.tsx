import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertOctagon,
  CheckCircle2,
  Database,
  Loader2,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useApi } from '../hooks/useApi';
import type { AnalyzeReviewResponse } from '../types/api';
import { GlassCard } from '../components/GlassCard';
import { SentimentBadge } from '../components/SentimentBadge';
import { ModelErrorBanner } from '../components/ModelErrorBanner';

const SAMPLE_REVIEWS = [
  {
    label: 'Positive Experience',
    product: 'BarkBox Monthly Dog Subscription',
    rating: 5,
    text: 'Absolutely love this box! Every single month the toys are super durable, the treats are high quality, and my dog gets excited the second it arrives at the door. Worth every penny.',
  },
  {
    label: 'Mixed / Neutral',
    product: 'Universal Yums Snack Box',
    rating: 3,
    text: 'The snacks were interesting and packaging was nice, though some items were pretty small for the price. Not bad overall, just okay compared to what I expected.',
  },
  {
    label: 'Negative Complaint',
    product: 'Loot Crate Geek & Gamer Box',
    rating: 1,
    text: 'Complete waste of money. My package arrived three weeks late with a broken mug and cheap filler junk. Tried to cancel my subscription and customer support never replied, then they charged my credit card again.',
  },
];

const HALO_BY_SENTIMENT = {
  Positive: 'from-emerald-500/25 via-cyan-500/10 to-transparent border-emerald-500/35',
  Neutral: 'from-amber-500/25 via-orange-500/10 to-transparent border-amber-500/35',
  Negative: 'from-rose-500/25 via-violet-500/10 to-transparent border-rose-500/35',
};

export function LiveAnalyzerPage() {
  const [reviewText, setReviewText] = useState('');
  const [productName, setProductName] = useState('');
  const [rating, setRating] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeReviewResponse | null>(null);

  const { data: liveHistory, refetch: refetchHistory } = useApi(
    () => api.getReviews({ source: 'live', page: 1, page_size: 8 }),
    []
  );
  const { data: prodList } = useApi(() => api.getProductComparison(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reviewText.trim().length < 3) {
      setError('Please enter a customer review (at least 3 characters).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.analyzeReview({
        review_text: reviewText.trim(),
        product_name: productName.trim() || 'Unspecified Product',
        rating: rating ? Number(rating) : null,
      });
      setResult(response);
      refetchHistory();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to analyze review.');
      }
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <ModelErrorBanner
          title="Prediction Request Failed"
          message={error}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Input Form */}
        <GlassCard
          title="Live Review Sentiment Analyzer"
          subtitle="Send raw customer feedback to the trained FastAPI ML model and persist predictions in SQLite"
          className="lg:col-span-7"
        >
          {/* Quick-fill real examples */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-slate-400">Try a realistic review sample:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_REVIEWS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setReviewText(sample.text);
                    setProductName(sample.product);
                    setRating(String(sample.rating));
                    setError(null);
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Product Name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  list="existing-products"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. BarkBox Monthly Dog Subscription"
                  className="w-full rounded-xl border border-white/10 bg-[#060B18] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                />
                <datalist id="existing-products">
                  {(prodList?.available_products ?? []).slice(0, 30).map((p) => (
                    <option key={p.product_name} value={p.product_name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Star Rating <span className="text-slate-500">(optional)</span>
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#060B18] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60"
                >
                  <option value="">Not specified</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Customer Review Text <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={6}
                required
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Paste or type a customer product review to classify..."
                className="w-full resize-y rounded-xl border border-white/10 bg-[#060B18] p-3.5 text-sm leading-relaxed text-white placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Runs directly against the persisted joblib scikit-learn pipeline</span>
                <span className="font-mono">{reviewText.length} chars</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setReviewText('');
                  setProductName('');
                  setRating('');
                  setResult(null);
                  setError(null);
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.04]"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting || reviewText.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Analyze Review
                  </>
                )}
              </button>
            </div>
          </form>
        </GlassCard>

        {/* Right Animated Result Card */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`glass-panel relative overflow-hidden rounded-2xl border p-6 ${
                  HALO_BY_SENTIMENT[result.predicted_sentiment]
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${
                    HALO_BY_SENTIMENT[result.predicted_sentiment]
                  } opacity-55`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                      <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                      ML Inference Result
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-300">
                      <Database className="h-3 w-3" />
                      Saved #{result.id}
                    </span>
                  </div>

                  {/* Main Sentiment & Confidence */}
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Predicted Sentiment</p>
                      <div className="mt-2">
                        <SentimentBadge sentiment={result.predicted_sentiment} size="lg" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Model Confidence</p>
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-white tabular-nums">
                        {(result.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 3-Class Probabilities */}
                  <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.08] bg-[#060B18]/80 p-4">
                    <p className="text-xs font-semibold text-slate-300">
                      Three-Class Probability Distribution
                    </p>
                    {(['Positive', 'Neutral', 'Negative'] as const).map((cls) => {
                      const pct = result.probabilities[cls] * 100;
                      const barColor =
                        cls === 'Positive'
                          ? 'bg-emerald-500'
                          : cls === 'Neutral'
                            ? 'bg-amber-500'
                            : 'bg-rose-500';
                      return (
                        <div key={cls}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-slate-300">{cls}</span>
                            <span className="font-mono text-white">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              className={`h-full rounded-full ${barColor}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Complaint Category */}
                  {result.complaint_category && (
                    <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                        <AlertOctagon className="h-4 w-4 shrink-0" />
                        Detected Complaint Category
                      </div>
                      <p className="mt-1 text-sm font-medium text-white">
                        {result.complaint_category}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3 text-[11px] text-slate-400">
                    <span>Model: <strong className="text-slate-200">{result.model_name}</strong></span>
                    <span className="truncate">Product: <strong className="text-slate-200">{result.product_name}</strong></span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel flex h-full min-h-[340px] flex-col items-center justify-center rounded-2xl p-8 text-center"
              >
                <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-blue-400">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  Awaiting Customer Review
                </h3>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
                  Enter a review on the left or click a sample prompt to inspect real-time
                  three-class sentiment probabilities, confidence, and complaint categorization.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Persisted Live Analysis History */}
      <GlassCard
        title="Recent Live Predictions (Persisted in SQLite)"
        subtitle="Reviews submitted through the Live Analyzer are permanently saved and reflected across all dashboards"
      >
        {!liveHistory || liveHistory.items.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No live reviews analyzed yet. Submit your first review above to see it persisted here.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {liveHistory.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-white">
                    {item.product_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.rating !== null && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-amber-300">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {item.rating}
                      </span>
                    )}
                    <SentimentBadge sentiment={item.predicted_sentiment} size="xs" />
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300">
                  {item.review_text}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    Conf: <strong className="font-mono text-slate-200">{(item.confidence * 100).toFixed(1)}%</strong>
                  </span>
                  {item.complaint_category && (
                    <span className="text-rose-300">{item.complaint_category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

