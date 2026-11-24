import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  GitCompare,
  Layers,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { SentimentBadge } from '../components/SentimentBadge';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Real-Time ML Sentiment Engine',
    desc: 'Trained TF-IDF + Logistic Regression & Linear SVM pipelines predict 3-class sentiment with calibrated probabilities—zero hardcoded rules or fake scores.',
    accent: 'text-blue-400 bg-blue-500/15 border-blue-500/25',
  },
  {
    icon: UploadCloud,
    title: 'Smart CSV Upload & Schema Mapping',
    desc: 'Upload any e-commerce CSV, map custom columns, automatically deduplicate and validate records, and classify thousands of reviews in seconds.',
    accent: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25',
  },
  {
    icon: AlertOctagon,
    title: 'Complaint Topic Clustering',
    desc: 'Unsupervised K-Means clustering over TF-IDF or optional Sentence Transformer embeddings surfaces recurring customer pain points automatically.',
    accent: 'text-rose-400 bg-rose-500/15 border-rose-500/25',
  },
  {
    icon: GitCompare,
    title: 'Product Comparison Matrix',
    desc: 'Benchmark products side-by-side on review volume, sentiment ratios, negative complaint drivers, average ratings, and monthly trajectories.',
    accent: 'text-violet-400 bg-violet-500/15 border-violet-500/25',
  },
  {
    icon: Cpu,
    title: 'Auditable Model Performance',
    desc: 'Inspect real held-out test Accuracy, Macro F1, precision/recall, 3×3 confusion matrix, and transparent proxy-label limitations.',
    accent: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
  },
  {
    icon: Database,
    title: 'Persistent SQLite Intelligence',
    desc: 'Every live prediction, uploaded dataset, and product insight is stored in SQLite via SQLAlchemy and survives server restarts seamlessly.',
    accent: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Ingest & Clean',
    desc: 'Upload review CSVs or enter live feedback. ReviewIQ validates schema, removes duplicates/nulls, and normalizes text.',
  },
  {
    step: '02',
    title: 'Vectorize & Classify',
    desc: 'The joblib-persisted TF-IDF sentiment model predicts Positive, Neutral, or Negative polarity with 3-class probabilities.',
  },
  {
    step: '03',
    title: 'Cluster Complaints',
    desc: 'Negative feedback is grouped via K-Means clustering to uncover top recurring issues, keywords, and representative quotes.',
  },
  {
    step: '04',
    title: 'Explore Insights',
    desc: 'Track sentiment trends, compare products, filter & export records, and audit held-out ML metrics from one workspace.',
  },
];

export function LandingPage() {
  const { data: overview } = useApi(() => api.getOverview(), []);
  const { data: metrics } = useApi(() => api.getModelMetrics(), []);

  const trendPreview = (overview?.sentiment_trends ?? []).slice(-10);

  return (
    <div className="min-h-screen bg-[#040712] text-slate-100">
      {/* Subtle Grid Overlay */}
      <div className="bg-grid-subtle pointer-events-none fixed inset-0 opacity-60" />

      {/* Top Glass Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#040712]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-glow">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">ReviewIQ</span>
              <span className="ml-2 hidden rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300 sm:inline-block">
                ML Analytics
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Capabilities
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How It Works
            </a>
            <Link to="/model" className="transition hover:text-white">
              Model Metrics
            </Link>
            <Link to="/dashboard" className="transition hover:text-white">
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/analyze"
              className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-blue-400/40 hover:bg-white/[0.08] sm:inline-flex"
            >
              Live Analyzer
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              Launch App
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pb-20 pt-14 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Hero Left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium text-blue-300">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Self-Trained Scikit-Learn & K-Means Customer Intelligence</span>
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.06]">
                Every Review{' '}
                <span className="text-gradient">Tells a Story.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Turn customer feedback into powerful intelligence with machine learning.
                ReviewIQ classifies real e-commerce reviews, detects recurring complaint
                clusters, and benchmarks products with complete statistical transparency.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01] hover:brightness-110"
                >
                  <BarChart3 className="h-4 w-4" />
                  Explore Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/analyze"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-blue-400/40 hover:bg-white/[0.08]"
                >
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  Analyze a Review
                </Link>
              </div>

              {/* Trust / Real Telemetry Strip */}
              <div className="mt-9 grid grid-cols-3 gap-4 border-t border-white/[0.08] pt-6">
                <div>
                  <p className="text-xl font-bold text-white tabular-nums sm:text-2xl">
                    {overview ? overview.total_reviews.toLocaleString() : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Analyzed Reviews</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-300 tabular-nums sm:text-2xl">
                    {metrics ? `${(metrics.selected_metrics.accuracy * 100).toFixed(1)}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Held-Out Accuracy</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-violet-300 tabular-nums sm:text-2xl">
                    {metrics ? metrics.selected_metrics.macro_f1.toFixed(3) : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Macro F1-Score</p>
                </div>
              </div>
            </motion.div>

            {/* Hero Right: Live Animated Analytics Preview */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative lg:col-span-6"
            >
              <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-violet-600/15 to-cyan-500/10 blur-2xl" />
              <div className="glass-panel relative overflow-hidden rounded-3xl p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Live ReviewIQ Telemetry
                    </span>
                  </div>
                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-blue-300">
                    {metrics?.selected_model ?? 'Scikit-Learn Pipeline'}
                  </span>
                </div>

                {/* Sentiment Split Pills */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3.5">
                    <p className="text-[11px] font-medium text-emerald-300/80">Positive</p>
                    <p className="mt-1 text-xl font-bold text-white tabular-nums">
                      {overview ? `${overview.positive_pct.toFixed(1)}%` : '—'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-emerald-300/70">
                      {overview ? `${overview.positive_count.toLocaleString()} reviews` : 'Loading...'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-3.5">
                    <p className="text-[11px] font-medium text-amber-300/80">Neutral</p>
                    <p className="mt-1 text-xl font-bold text-white tabular-nums">
                      {overview ? `${overview.neutral_pct.toFixed(1)}%` : '—'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-amber-300/70">
                      {overview ? `${overview.neutral_count.toLocaleString()} reviews` : 'Loading...'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] p-3.5">
                    <p className="text-[11px] font-medium text-rose-300/80">Negative</p>
                    <p className="mt-1 text-xl font-bold text-white tabular-nums">
                      {overview ? `${overview.negative_pct.toFixed(1)}%` : '—'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-rose-300/70">
                      {overview ? `${overview.negative_count.toLocaleString()} reviews` : 'Loading...'}
                    </p>
                  </div>
                </div>

                {/* Live Mini Trend Chart */}
                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#060B18]/75 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Processed Sentiment Trajectory
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Avg Conf: {overview ? `${(overview.average_confidence * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="h-40 w-full">
                    {trendPreview.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendPreview}>
                          <defs>
                            <linearGradient id="landingPos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="landingNeg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.32} />
                              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="period"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0B1124',
                              borderColor: 'rgba(148,163,184,0.2)',
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="Positive"
                            stroke="#10B981"
                            strokeWidth={2}
                            fill="url(#landingPos)"
                          />
                          <Area
                            type="monotone"
                            dataKey="Negative"
                            stroke="#F43F5E"
                            strokeWidth={2}
                            fill="url(#landingNeg)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">
                        Connect to FastAPI backend to stream live review trends
                      </div>
                    )}
                  </div>
                </div>

                {/* Latest Classified Review Snippet */}
                {overview?.recent_reviews?.[0] && (
                  <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-200">
                        {overview.recent_reviews[0].product_name}
                      </span>
                      <SentimentBadge
                        sentiment={overview.recent_reviews[0].predicted_sentiment}
                        size="xs"
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                      "{overview.recent_reviews[0].review_text}"
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Confidence:{' '}
                        <strong className="font-mono text-blue-300">
                          {(overview.recent_reviews[0].confidence * 100).toFixed(1)}%
                        </strong>
                      </span>
                      {overview.recent_reviews[0].complaint_category && (
                        <span className="text-rose-300/90">
                          {overview.recent_reviews[0].complaint_category}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="features" className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Platform Capabilities
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              End-to-End Review Intelligence, Built on Real ML
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
              Designed for B.E. CSE (AI&ML) rigor: reproducible training pipelines, honest
              held-out evaluation, interactive visual analytics, and persistent data storage.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, accent }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="glass-panel glass-panel-hover rounded-2xl p-6"
              >
                <div className={`inline-flex rounded-xl border p-2.5 ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              How It Works
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From Raw Customer Text to Actionable Strategy
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.07 }}
                className="glass-panel relative rounded-2xl p-6"
              >
                <span className="font-mono text-xs font-bold text-blue-400">{item.step}</span>
                <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-14 glass-panel rounded-3xl p-8 text-center sm:p-10">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Zero Fake Predictions • Real Scikit-Learn Artifacts • FastAPI + SQLite</span>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
              Ready to uncover what your customers are really saying?
            </h3>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
              >
                Explore Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-400/40"
              >
                <Layers className="h-4 w-4 text-blue-400" />
                Upload CSV Dataset
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <span>ReviewIQ — Intelligent E-Commerce Review Analysis & Customer Insight System</span>
          </div>
          <span>React • TypeScript • FastAPI • Scikit-Learn • SQLite</span>
        </div>
      </footer>
    </div>
  );
}

