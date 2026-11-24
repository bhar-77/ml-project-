import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Cpu,
  Database,
  ShieldAlert,
  Target,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export function ModelPerformancePage() {
  const { data, loading, error, refetch } = useApi(() => api.getModelMetrics(), []);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <ModelErrorBanner
        title="Model Evaluation Artifact Unavailable"
        message={
          error ??
          'Evaluated model metrics artifact (model_metrics.json) was not found. Train the model using python -m ml.train.'
        }
        onRetry={refetch}
      />
    );
  }

  const sel = data.selected_metrics;
  const cmLabels = sel.confusion_matrix.labels;
  const cmMatrix = sel.confusion_matrix.matrix;

  const perClassData = cmLabels.map((label) => ({
    label,
    Precision: +(sel.per_class[label].precision * 100).toFixed(2),
    Recall: +(sel.per_class[label].recall * 100).toFixed(2),
    F1: +(sel.per_class[label].f1_score * 100).toFixed(2),
    support: sel.per_class[label].support,
  }));

  const comparisonChartData = data.model_comparison.map((m) => ({
    name: m.model_name.replace('TF-IDF + ', ''),
    Accuracy: +(m.accuracy * 100).toFixed(2),
    'Macro F1': +(m.macro_f1 * 100).toFixed(2),
    'Weighted F1': +(m.weighted_f1 * 100).toFixed(2),
  }));

  const splitDistData = cmLabels.map((label) => ({
    label,
    Train: data.dataset.class_distribution.train[label],
    Test: data.dataset.class_distribution.test[label],
  }));

  return (
    <div className="space-y-6">
      {/* Selected Model Banner */}
      <GlassCard className="border-blue-500/30 bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-violet-600/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-2xl border border-blue-400/35 bg-blue-500/20 p-3 text-blue-300">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Active Production Model
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Seed = {data.random_seed} • Split = {Math.round((1 - data.test_split_ratio) * 100)}/
                  {Math.round(data.test_split_ratio * 100)}
                </span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold text-white">{data.selected_model}</h2>
              <p className="mt-1 text-xs text-slate-300">{data.selection_criterion}</p>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-400">
            <p>Evaluated on {data.dataset.test_samples.toLocaleString()} held-out test reviews</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Trained: {new Date(data.trained_at).toLocaleString()}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Core Metric KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Test Accuracy"
          value={`${(sel.accuracy * 100).toFixed(2)}%`}
          sublabel={`${data.dataset.test_samples.toLocaleString()} held-out test samples`}
          icon={<Target className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Macro F1-Score"
          value={sel.macro_f1.toFixed(4)}
          sublabel="Selection criterion across 3 classes"
          icon={<Cpu className="h-5 w-5" />}
          accent="violet"
        />
        <StatCard
          label="Macro Precision"
          value={sel.macro_precision.toFixed(4)}
          sublabel={`Weighted F1: ${sel.weighted_f1.toFixed(4)}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Macro Recall"
          value={sel.macro_recall.toFixed(4)}
          sublabel={
            sel.confidence_stats.mean_confidence !== null
              ? `Mean Conf: ${(sel.confidence_stats.mean_confidence * 100).toFixed(1)}%`
              : 'Held-out recall'
          }
          icon={<Database className="h-5 w-5" />}
          accent="cyan"
        />
      </div>

      {/* Algorithm Comparison & Confusion Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard
          title="Algorithm Benchmark Comparison"
          subtitle="Identical stratified train/test split • Zero TF-IDF leakage"
          className="lg:col-span-6"
        >
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Accuracy" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Macro F1" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Weighted F1" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Algorithm</th>
                  <th className="px-3 py-2.5">Accuracy</th>
                  <th className="px-3 py-2.5">Macro F1</th>
                  <th className="px-3 py-2.5">Precision</th>
                  <th className="px-3 py-2.5">Recall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-mono">
                {data.model_comparison.map((m) => (
                  <tr
                    key={m.model_name}
                    className={m.model_name === data.selected_model ? 'bg-blue-500/10' : ''}
                  >
                    <td className="px-3 py-2.5 font-sans font-medium text-white">
                      {m.model_name}
                      {m.model_name === data.selected_model && (
                        <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-200">{(m.accuracy * 100).toFixed(2)}%</td>
                    <td className="px-3 py-2.5 font-semibold text-violet-300">{m.macro_f1.toFixed(4)}</td>
                    <td className="px-3 py-2.5 text-slate-300">{m.macro_precision.toFixed(4)}</td>
                    <td className="px-3 py-2.5 text-slate-300">{m.macro_recall.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* 3x3 Confusion Matrix Heatmap */}
        <GlassCard
          title="Held-Out Test Confusion Matrix"
          subtitle="Rows = Rating-derived proxy label • Columns = Predicted label"
          className="lg:col-span-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-2 text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[11px] font-medium uppercase text-slate-500">
                    True \ Pred
                  </th>
                  {cmLabels.map((lbl) => (
                    <th key={lbl} className="p-2 font-semibold text-slate-300">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cmMatrix.map((row, rIdx) => {
                  const rowSum = row.reduce((a, b) => a + b, 0) || 1;
                  return (
                    <tr key={cmLabels[rIdx]}>
                      <td className="p-2 text-left font-semibold text-slate-300">{cmLabels[rIdx]}</td>
                      {row.map((val, cIdx) => {
                        const pct = val / rowSum;
                        const isDiag = rIdx === cIdx;
                        const bg = isDiag
                          ? `rgba(59, 130, 246, ${0.18 + pct * 0.55})`
                          : `rgba(244, 63, 94, ${0.06 + pct * 0.45})`;
                        return (
                          <td
                            key={cIdx}
                            style={{ backgroundColor: bg }}
                            className={`rounded-xl border p-4 font-mono ${
                              isDiag ? 'border-blue-400/35 text-white' : 'border-white/10 text-slate-200'
                            }`}
                          >
                            <div className="text-base font-bold tabular-nums">{val.toLocaleString()}</div>
                            <div className="mt-0.5 text-[11px] text-slate-300">
                              {(pct * 100).toFixed(1)}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Confidence calibration stats */}
          {sel.confidence_stats.mean_confidence !== null && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <p className="text-[11px] text-slate-400">Overall Conf</p>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {(sel.confidence_stats.mean_confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                <p className="text-[11px] text-emerald-300">When Correct</p>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {((sel.confidence_stats.mean_confidence_correct ?? 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3">
                <p className="text-[11px] text-rose-300">When Incorrect</p>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {((sel.confidence_stats.mean_confidence_incorrect ?? 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Per-Class Metrics & Dataset Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard
          title="Per-Class Precision, Recall & F1"
          subtitle="Performance across Negative, Neutral, and Positive classes"
          className="lg:col-span-6"
        >
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perClassData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Precision" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Recall" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="F1" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard
          title="Dataset Details & Stratified Split"
          subtitle={data.dataset.name}
          className="lg:col-span-6"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-400">Raw Rows</p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {data.dataset.cleaning.raw_rows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-400">Valid Cleaned</p>
              <p className="mt-1 font-mono text-sm font-bold text-emerald-300">
                {data.dataset.total_samples.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-400">Train Samples</p>
              <p className="mt-1 font-mono text-sm font-bold text-blue-300">
                {data.dataset.train_samples.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-400">Test Samples</p>
              <p className="mt-1 font-mono text-sm font-bold text-violet-300">
                {data.dataset.test_samples.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={splitDistData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1124',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Train" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Test" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            <strong className="text-slate-200">Leakage Prevention:</strong> {data.leakage_prevention}
          </p>
        </GlassCard>
      </div>

      {/* Proxy Label Notice & Limitations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <GlassCard className="border-amber-500/30 bg-amber-500/[0.05] lg:col-span-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                Rating-Derived Proxy Labels Notice
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-amber-100/80">
                {data.dataset.label_methodology}
              </p>
              <p className="mt-2 font-mono text-[11px] text-slate-400">
                Source:{' '}
                <a
                  href={data.dataset.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 underline hover:text-blue-200"
                >
                  {data.dataset.source_url}
                </a>
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Model Limitations & Scientific Caveats
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-300">
            {data.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

