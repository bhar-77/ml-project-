import { useState } from 'react';
import { AlertOctagon, Check, Star } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { GlassCard } from '../components/GlassCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ModelErrorBanner } from '../components/ModelErrorBanner';

const LINE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E'];

export function ProductComparisonPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { data, loading, error, refetch } = useApi(
    () => api.getProductComparison(selectedProducts.length > 0 ? selectedProducts : undefined),
    [selectedProducts.join('||')]
  );

  if (loading && !data) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <ModelErrorBanner
        title="Unable to Load Product Comparison"
        message={error ?? 'No product comparison data returned.'}
        onRetry={refetch}
      />
    );
  }

  const activeNames = new Set(data.compared_products.map((p) => p.product_name));

  function toggleProduct(name: string) {
    const current = selectedProducts.length > 0 ? selectedProducts : Array.from(activeNames);
    if (current.includes(name)) {
      if (current.length <= 1) return;
      setSelectedProducts(current.filter((p) => p !== name));
    } else if (current.length < 5) {
      setSelectedProducts([...current, name]);
    }
  }

  // Build merged trend timeline across compared products
  const periodSet = new Set<string>();
  data.compared_products.forEach((p) => p.trends.forEach((t) => periodSet.add(t.period)));
  const mergedTrends = Array.from(periodSet)
    .sort()
    .slice(-12)
    .map((period) => {
      const row: Record<string, string | number> = { period };
      data.compared_products.forEach((p) => {
        const hit = p.trends.find((t) => t.period === period);
        row[p.product_name] = hit ? hit.total : 0;
      });
      return row;
    });

  return (
    <div className="space-y-6">
      {/* Product Picker */}
      <GlassCard
        title="Select Products to Compare (up to 5)"
        subtitle={`Comparing ${data.compared_products.length} of ${data.total_products} persisted products`}
      >
        <div className="flex flex-wrap gap-2">
          {data.available_products.slice(0, 14).map((p) => {
            const isSelected = activeNames.has(p.product_name);
            return (
              <button
                key={p.product_name}
                type="button"
                onClick={() => toggleProduct(p.product_name)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? 'border-blue-400/50 bg-blue-500/20 text-white shadow-glow'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-blue-300" />}
                <span className="max-w-[200px] truncate">{p.product_name}</span>
                <span className="font-mono text-[10px] text-slate-400">({p.review_volume})</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Side-by-Side Comparison Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard
          title="Sentiment Percentage Comparison"
          subtitle="Positive vs Neutral vs Negative share per product"
          className="lg:col-span-6"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.compared_products}
                margin={{ top: 8, right: 10, left: -12, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="product_name"
                  tick={{ fill: '#cbd5e1', fontSize: 10 }}
                  tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 14)}…` : v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  unit="%"
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
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="positive_pct" name="Positive %" stackId="s" fill="#10B981" />
                <Bar dataKey="neutral_pct" name="Neutral %" stackId="s" fill="#F59E0B" />
                <Bar dataKey="negative_pct" name="Negative %" stackId="s" fill="#F43F5E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard
          title="Review Volume Trends by Product"
          subtitle="Monthly review activity comparison"
          className="lg:col-span-6"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedTrends} margin={{ top: 8, right: 12, left: -16, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
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
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {data.compared_products.map((prod, idx) => (
                  <Line
                    key={prod.product_name}
                    type="monotone"
                    dataKey={prod.product_name}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2.2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Product Detail Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data.compared_products.map((prod) => (
          <GlassCard key={prod.product_name} hover>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-white">{prod.product_name}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {prod.review_volume.toLocaleString()} reviews • Avg Conf{' '}
                  {(prod.avg_confidence * 100).toFixed(1)}%
                </p>
              </div>
              {prod.avg_rating !== null && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {prod.avg_rating.toFixed(2)}
                </span>
              )}
            </div>

            {/* Sentiment Bar */}
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs font-mono">
                <span className="text-emerald-300">Pos {prod.positive_pct.toFixed(1)}%</span>
                <span className="text-amber-300">Neu {prod.neutral_pct.toFixed(1)}%</span>
                <span className="text-rose-300">Neg {prod.negative_pct.toFixed(1)}%</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div className="bg-emerald-500" style={{ width: `${prod.positive_pct}%` }} />
                <div className="bg-amber-500" style={{ width: `${prod.neutral_pct}%` }} />
                <div className="bg-rose-500" style={{ width: `${prod.negative_pct}%` }} />
              </div>
            </div>

            {/* Top Recurring Complaints */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recurring Complaints
              </p>
              {prod.top_complaints.length === 0 ? (
                <p className="text-xs text-slate-500">No negative complaints recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {prod.top_complaints.map((c) => (
                    <span
                      key={c.category}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200"
                    >
                      <AlertOctagon className="h-3 w-3 text-rose-400" />
                      {c.category}
                      <strong className="font-mono text-rose-300">({c.count})</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sample Negative Feedback */}
            {prod.sample_negative_reviews.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Notable Negative Feedback
                </p>
                {prod.sample_negative_reviews.slice(0, 2).map((neg) => (
                  <div
                    key={neg.id}
                    className="rounded-xl border border-white/[0.06] bg-[#060B18]/75 p-3 text-xs text-slate-300"
                  >
                    <p className="line-clamp-2">"{neg.review_text}"</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

