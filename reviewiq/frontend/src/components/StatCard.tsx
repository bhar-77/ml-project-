import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: ReactNode;
  accent?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';
  delay?: number;
}

const ACCENT_MAP = {
  blue: {
    iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    glow: 'from-blue-500/20 via-transparent to-transparent',
    bar: 'bg-blue-500',
  },
  emerald: {
    iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    glow: 'from-emerald-500/20 via-transparent to-transparent',
    bar: 'bg-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    glow: 'from-amber-500/20 via-transparent to-transparent',
    bar: 'bg-amber-500',
  },
  rose: {
    iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    glow: 'from-rose-500/20 via-transparent to-transparent',
    bar: 'bg-rose-500',
  },
  violet: {
    iconBg: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    glow: 'from-violet-500/20 via-transparent to-transparent',
    bar: 'bg-violet-500',
  },
  cyan: {
    iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
    glow: 'from-cyan-500/20 via-transparent to-transparent',
    bar: 'bg-cyan-500',
  },
};

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  accent = 'blue',
  delay = 0,
}: StatCardProps) {
  const styles = ACCENT_MAP[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel glass-panel-hover relative overflow-hidden rounded-2xl p-5"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${styles.glow} opacity-60`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">
            {value}
          </p>
          {sublabel && <p className="mt-1.5 text-xs text-slate-400">{sublabel}</p>}
        </div>
        <div className={`shrink-0 rounded-xl border p-2.5 ${styles.iconBg}`}>{icon}</div>
      </div>
    </motion.div>
  );
}

