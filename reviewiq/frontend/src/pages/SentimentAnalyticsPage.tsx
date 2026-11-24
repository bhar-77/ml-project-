import { useState } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { SentimentBadge } from '../components/SentimentBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ModelErrorBanner } from '../components/ModelErrorBanner';

const COLORS: Record<string, string> = {
  Positive: '#10B981',
  Neutral: '#F59E0B',
  Negative: '#F43F5E',
};

export function SentimentAnalyticsPage() {
  const [product, setProduct] = useState('ALL');
  const [sentiment, setSentiment] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [minConfidence, setMinConfidence] = useState(0);
  const [search, setSearch] = useState('');
  const [keywordTab, setKeywordTab] = useState<'overall' | 'Positive' | 'Negative' | 'Neutral'>('overall');
  const [page, setPage] = useState(1);

  const { data: analytics, loading, error, refetch } = useApi(
    () =>
      api.getSentimentAnalytics({
        product,
        sentiment,
        source,
        min_confidence: minConfidence > 0 ? minConfidence : undefined,
      }),
    [product, sentiment, source, minConfidence]
  );

  const { data: reviewsPage } = useApi(
    () =>
      api.getReviews({
        page,
        page_size: 12,
        product,
        sentiment,
        source,
        search,
        min_confidence: minConfidence > 0 ? minConfidence : undefined,
      }),
    [page, product, sentiment, source, search, minConfidence]
  );

  const csvExportUrl = api.getReviewsCsvUrl({
    product,
    sentiment,
    source,
    search,
    min_confidence: minConfidence > 0 ? minConfidence : undefined,
  });

  if (loading && !analytics) return <LoadingSkeleton />;
  if (error || !analytics) {
    return (
      <ModelErrorBanner
        title="Unable to Load Sentiment Analytics"
        message={error ?? 'No analytics data returned.'}
        onRetry={refetch}
      />
    );
  }

  const activeKeywords = analytics.keyword_frequency[keywordTab] ?? [];
  const totalPages = reviewsPage ? Math.max(1, Math.ceil(reviewsPage.total / reviewsPage.page_size)) : 1;

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <GlassCard>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-400">Product</label>
              <select
                value={product}
                onChange={(e) => {
                  setProduct(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#060B18] px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
              >
                <option value="ALL">All Products ({analytics.available_products.length})</option>
                {analytics.available_products.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-400">Sentiment</label>
              <select
                value={sentiment}
                onChange={(e) => {
                  setSentiment(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#060B18] px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
              >
                <option value="ALL">All Sentiments</option>
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-400">Data Source</label>
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#060B18] px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60"
              >
                <option value="ALL">All Sources</option>
                <option value="live">Live Analyzer</option>
                <option value="upload">CSV Upload</option>
                <option value="seed">Initial Seed</option>
              </select>
            </div>

            <div>
              <label className="mb-1 flex justify-between text-[11px] font-medium text-slate-400">
                <span>Min Confidence</span>
                <span className="font-mono text-blue-300">{Math.round(minConfidence * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={minConfidence}
                onChange={(e) => {
                  setMinConfidence(Number(e.target.value));
                  setPage(1);
                }}
                className="mt-2 w-full accent-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-slate-300">
              <Filter className="h-3.5 w-3.5 text-blue-400" />
              {analytics.total_filtered_reviews.toLocaleString()} matched
            </span>
            <a
              href={csvExportUrl}
              download="reviewiq_analyzed_reviews.csv"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
          </div>
        </div>
      </GlassCard>

      {/* Row 1: Distribution & Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard title="Filtered Sentiment Mix" subtitle="Share of classified reviews" className="lg:col-span-4">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.sentiment_distribution}
                  dataKey="count"
                  nameKey="sentiment"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={4}
                  stroke="none"
                >
                  {analytics.sentiment_distribution.map((item) => (
                    <Cell key={item.sentiment} fill={COLORS[item.sentiment]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Review Sentiment Trends" subtitle="Volume trajectory across time" className="lg:col-span-8">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.review_trends} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="Positive" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="Neutral" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                <Area type="monotone" dataKey="Negative" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Row 2: Product-Level Sentiment & Confidence Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard
          title="Product-Level Sentiment Breakdown"
          subtitle="Top products by filtered review count"
          className="lg:col-span-7"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.product_sentiment.slice(0, 8)}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="product_name"
                  width={150}
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 20)}…` : v)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Positive" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Neutral" stackId="a" fill="#F59E0B" />
                <Bar dataKey="Negative" stackId="a" fill="#F43F5E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard
          title="Model Confidence Distribution"
          subtitle="Histogram of predicted top-class probabilities"
          className="lg:col-span-5"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.confidence_distribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Reviews" fill="#6366F1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Row 3: Keyword Frequency */}
      <GlassCard
        title="Keyword Frequency Analysis"
        subtitle="Most frequent informative tokens extracted from filtered customer reviews"
        action={
          <div className="flex flex-wrap gap-1.5">
            {(['overall', 'Positive', 'Negative', 'Neutral'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setKeywordTab(tab)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                  keywordTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeKeywords} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="keyword" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1124',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="count"
                name="Mentions"
                fill={
                  keywordTab === 'Positive'
                    ? '#10B981'
                    : keywordTab === 'Negative'
                      ? '#F43F5E'
                      : keywordTab === 'Neutral'
                        ? '#F59E0B'
                        : '#3B82F6'
                }
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Row 4: Paginated Review Explorer Table */}
      <GlassCard
        title="Analyzed Reviews Explorer"
        subtitle="Search and inspect individual records classified by the trained model"
        action={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search review text or product..."
              className="w-full rounded-xl border border-white/10 bg-[#060B18] py-2 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/60"
            />
          </div>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Sentiment</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {(reviewsPage?.items ?? []).map((rev) => (
                <tr key={rev.id} className="hover:bg-white/[0.02]">
                  <td className="max-w-[180px] truncate px-4 py-3 font-medium text-white">
                    {rev.product_name}
                  </td>
                  <td className="max-w-[380px] px-4 py-3 text-slate-300">
                    <p className="line-clamp-2">{rev.review_text}</p>
                    {rev.complaint_category && (
                      <span className="mt-1 inline-block text-[10px] text-rose-300">
                        Topic: {rev.complaint_category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SentimentBadge sentiment={rev.predicted_sentiment} size="xs" />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {(rev.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-400">
                    {rev.review_date ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                      {rev.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong> (
            {(reviewsPage?.total ?? 0).toLocaleString()} reviews)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

