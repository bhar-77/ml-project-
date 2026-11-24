import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowUpRight,
  Gauge,
  MessageSquareText,
  Smile,
  ThumbsDown,
  Meh,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
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
import { StatCard } from '../components/StatCard';
import { SentimentBadge } from '../components/SentimentBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ModelErrorBanner } from '../components/ModelErrorBanner';

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: '#10B981',
  Neutral: '#F59E0B',
  Negative: '#F43F5E',
};

export function OverviewDashboard() {
  const { data, loading, error, refetch } = useApi(() => api.getOverview(), []);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <ModelErrorBanner
        title="Unable to Load Overview Metrics"
        message={error ?? 'No overview data returned from backend.'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Reviews"
          value={data.total_reviews.toLocaleString()}
          sublabel={`${data.total_products} products • ${data.total_datasets} datasets`}
          icon={<MessageSquareText className="h-5 w-5" />}
          accent="blue"
          delay={0}
        />
        <StatCard
          label="Positive Reviews"
          value={data.positive_count.toLocaleString()}
          sublabel={`${data.positive_pct.toFixed(1)}% of total`}
          icon={<Smile className="h-5 w-5" />}
          accent="emerald"
          delay={0.04}
        />
        <StatCard
          label="Neutral Reviews"
          value={data.neutral_count.toLocaleString()}
          sublabel={`${data.neutral_pct.toFixed(1)}% of total`}
          icon={<Meh className="h-5 w-5" />}
          accent="amber"
          delay={0.08}
        />
        <StatCard
          label="Negative Reviews"
          value={data.negative_count.toLocaleString()}
          sublabel={`${data.negative_pct.toFixed(1)}% of total`}
          icon={<ThumbsDown className="h-5 w-5" />}
          accent="rose"
          delay={0.12}
        />
        <StatCard
          label="Avg Model Confidence"
          value={`${(data.average_confidence * 100).toFixed(1)}%`}
          sublabel="Real classifier probabilities"
          icon={<Gauge className="h-5 w-5" />}
          accent="violet"
          delay={0.16}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Donut Chart */}
        <GlassCard
          title="Sentiment Distribution"
          subtitle="Classified polarity across all persisted reviews"
          className="lg:col-span-5"
          delay={0.08}
        >
          {data.total_reviews === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              No reviews analyzed yet. Upload a CSV or analyze a review.
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="relative h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sentiment_distribution}
                      dataKey="count"
                      nameKey="sentiment"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {data.sentiment_distribution.map((entry) => (
                        <Cell
                          key={entry.sentiment}
                          fill={SENTIMENT_COLORS[entry.sentiment] ?? '#3B82F6'}
                        />
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
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {data.total_reviews.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400">Total</span>
                </div>
              </div>

              <div className="space-y-3">
                {data.sentiment_distribution.map((item) => (
                  <div
                    key={item.sentiment}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-200">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: SENTIMENT_COLORS[item.sentiment] }}
                        />
                        {item.sentiment}
                      </span>
                      <span className="font-mono font-semibold text-white">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">
                      {item.count.toLocaleString()} reviews
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Trend Line Chart */}
        <GlassCard
          title="Sentiment Trend Over Time"
          subtitle="Monthly classified review volume by polarity"
          className="lg:col-span-7"
          delay={0.12}
          action={
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 transition hover:text-blue-300"
            >
              Deep Analytics
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="h-64 w-full">
            {data.sentiment_trends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No dated review trends available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.sentiment_trends} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ovPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ovNeu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ovNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
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
                  <Area type="monotone" dataKey="Positive" stroke="#10B981" strokeWidth={2} fill="url(#ovPos)" />
                  <Area type="monotone" dataKey="Neutral" stroke="#F59E0B" strokeWidth={1.8} fill="url(#ovNeu)" />
                  <Area type="monotone" dataKey="Negative" stroke="#F43F5E" strokeWidth={2} fill="url(#ovNeg)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row: Top Complaints & Recent Reviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Complaints */}
        <GlassCard
          title="Top Recurring Complaints"
          subtitle="Dominant themes across predicted negative reviews"
          className="lg:col-span-5"
          delay={0.14}
          action={
            <Link
              to="/complaints"
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 transition hover:text-rose-300"
            >
              Open Clusters
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.top_complaints.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No negative complaint patterns detected yet.
            </div>
          ) : (
            <div className="space-y-4">
              {data.top_complaints.map((item) => (
                <div key={item.category}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 font-medium text-slate-200">
                      <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      <span className="truncate">{item.category}</span>
                    </span>
                    <span className="shrink-0 font-mono text-slate-300">
                      {item.count} ({(item.percentage ?? 0).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500"
                      style={{ width: `${Math.min(100, Math.max(4, item.percentage ?? 0))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent Reviews */}
        <GlassCard
          title="Recent Analyzed Reviews"
          subtitle="Latest predictions persisted in SQLite (live & uploaded)"
          className="lg:col-span-7"
          delay={0.16}
          action={
            <Link
              to="/analyze"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 transition hover:text-blue-300"
            >
              Analyze New
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-3">
            {data.recent_reviews.slice(0, 6).map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-blue-400/25"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-xs font-semibold text-white">
                      {rev.product_name}
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-400">
                      {rev.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">
                      {(rev.confidence * 100).toFixed(1)}%
                    </span>
                    <SentimentBadge sentiment={rev.predicted_sentiment} size="xs" />
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300">
                  {rev.review_text}
                </p>
                {rev.complaint_category && (
                  <p className="mt-2 text-[11px] text-rose-300/85">
                    Complaint Topic: <span className="font-medium">{rev.complaint_category}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

