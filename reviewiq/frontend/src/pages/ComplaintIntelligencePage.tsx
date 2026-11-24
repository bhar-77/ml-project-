import { useState } from 'react';
import {
  AlertOctagon,
  BookOpen,
  Cpu,
  Info,
  Layers,
  Tag,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { StatCard } from '../components/StatCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ModelErrorBanner } from '../components/ModelErrorBanner';

const CLUSTER_COLORS = ['#F43F5E', '#8B5CF6', '#3B82F6', '#F59E0B', '#06B6D4', '#EC4899', '#10B981'];

export function ComplaintIntelligencePage() {
  const [method, setMethod] = useState<'tfidf' | 'sbert'>('tfidf');
  const [numClusters, setNumClusters] = useState<number | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => api.getComplaintAnalytics({ method, k: numClusters }),
    [method, numClusters]
  );

  if (loading && !data) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <ModelErrorBanner
        title="Unable to Compute Complaint Clusters"
        message={error ?? 'No complaint clustering response.'}
        onRetry={refetch}
      />
    );
  }

  const activeCluster =
    data.clusters.find((c) => c.cluster_id === selectedClusterId) ?? data.clusters[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Unsupervised Complaint Topic Discovery</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Partitions predicted negative reviews into recurring complaint clusters using K-Means
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-white/10 bg-[#060B18] p-1">
              <button
                type="button"
                onClick={() => setMethod('tfidf')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  method === 'tfidf'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TF-IDF + K-Means
              </button>
              <button
                type="button"
                onClick={() => setMethod('sbert')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  method === 'sbert'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sentence Transformers{' '}
                {!data.methodology.sentence_transformers_available && '(Optional)'}
              </button>
            </div>

            <select
              value={numClusters ?? 'auto'}
              onChange={(e) =>
                setNumClusters(e.target.value === 'auto' ? null : Number(e.target.value))
              }
              className="rounded-xl border border-white/10 bg-[#060B18] px-3 py-2 text-xs text-white outline-none"
            >
              <option value="auto">K = Auto (Silhouette)</option>
              {[3, 4, 5, 6, 7].map((k) => (
                <option key={k} value={k}>
                  K = {k} Clusters
                </option>
              ))}
            </select>
          </div>
        </div>

        {data.methodology.fallback_notice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{data.methodology.fallback_notice}</span>
          </div>
        )}
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Negative Reviews Analyzed"
          value={data.total_negative_reviews.toLocaleString()}
          sublabel="Predicted Negative in SQLite"
          icon={<AlertOctagon className="h-5 w-5" />}
          accent="rose"
        />
        <StatCard
          label="Discovered Clusters"
          value={data.num_clusters}
          sublabel={numClusters ? 'User-selected K' : 'Silhouette-optimized K'}
          icon={<Layers className="h-5 w-5" />}
          accent="violet"
        />
        <StatCard
          label="Silhouette Score"
          value={data.silhouette_score !== null ? data.silhouette_score.toFixed(4) : 'N/A'}
          sublabel="Cluster separation cohesion"
          icon={<Cpu className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Active Vectorizer"
          value={data.methodology.active_method === 'sbert' ? 'SBERT' : 'TF-IDF'}
          sublabel={
            data.methodology.active_method === 'sbert'
              ? 'all-MiniLM-L6-v2 embeddings'
              : data.methodology.sentence_transformers_available
                ? '1-2 n-grams • SBERT ready'
                : '1-2 n-grams • SBERT optional'
          }
          icon={<Tag className="h-5 w-5" />}
          accent="cyan"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard
          title="Complaint Cluster Volumes"
          subtitle="Click a cluster below to inspect representative customer quotes"
          className="lg:col-span-7"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.clusters}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="topic_name"
                  width={185}
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 26 ? `${v.slice(0, 24)}…` : v)}
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
                <Bar dataKey="count" name="Negative Reviews" radius={[0, 8, 8, 0]}>
                  {data.clusters.map((entry, i) => (
                    <Cell
                      key={entry.cluster_id}
                      fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                      className="cursor-pointer"
                      onClick={() => setSelectedClusterId(entry.cluster_id)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard
          title="Lexical Complaint Category Share"
          subtitle="Rule-assisted taxonomy across negative reviews"
          className="lg:col-span-5"
        >
          <div className="space-y-3.5">
            {data.category_distribution.map((cat) => (
              <div key={cat.category}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{cat.category}</span>
                  <span className="font-mono text-slate-300">
                    {cat.count} ({(cat.percentage ?? 0).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-violet-500"
                    style={{ width: `${Math.min(100, Math.max(3, cat.percentage ?? 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Cluster Cards + Deep Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          {data.clusters.map((cluster, idx) => {
            const isSelected = activeCluster?.cluster_id === cluster.cluster_id;
            return (
              <button
                key={cluster.cluster_id}
                type="button"
                onClick={() => setSelectedClusterId(cluster.cluster_id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-blue-400/50 bg-blue-500/10 shadow-glow'
                    : 'glass-panel hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }}
                    />
                    <span className="text-sm font-semibold text-white">{cluster.topic_name}</span>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold text-blue-300">
                    {cluster.count} ({cluster.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cluster.keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Cluster Deep Dive */}
        <GlassCard
          title={activeCluster ? activeCluster.topic_name : 'Cluster Inspector'}
          subtitle={
            activeCluster
              ? `${activeCluster.count} negative reviews (${activeCluster.percentage.toFixed(1)}%) • Avg sentiment confidence ${(activeCluster.avg_confidence * 100).toFixed(1)}%`
              : 'Select a cluster'
          }
          className="lg:col-span-7"
        >
          {activeCluster ? (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Top Cluster Keywords (TF-IDF Centroid Weights)
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeCluster.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-mono text-xs text-violet-200"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {activeCluster.top_products.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Most Impacted Products
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeCluster.top_products.map((p) => (
                      <span
                        key={p.product_name}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200"
                      >
                        {p.product_name}{' '}
                        <strong className="ml-1 font-mono text-rose-300">({p.count})</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Representative Reviews Closest to Cluster Centroid
                </p>
                <div className="space-y-3">
                  {activeCluster.representative_reviews.map((rep) => (
                    <div
                      key={rep.id}
                      className="rounded-xl border border-white/[0.07] bg-[#060B18]/80 p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-white">{rep.product_name}</span>
                        <span className="font-mono text-[11px] text-rose-300">
                          Conf {(rep.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        "{rep.review_text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-slate-400">
              Not enough negative reviews to form clusters.
            </p>
          )}
        </GlassCard>
      </div>

      {/* Methodology & Limitations */}
      <GlassCard
        title="Clustering Methodology & Limitations"
        subtitle="Transparent ML documentation for academic & engineering review"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
              <BookOpen className="h-4 w-4" />
              Method Overview
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {data.methodology.description}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Info className="h-4 w-4" />
              Known Limitations
            </div>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-300">
              {data.methodology.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

