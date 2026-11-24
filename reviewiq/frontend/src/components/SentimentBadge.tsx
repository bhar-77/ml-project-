import type { SentimentLabel } from '../types/api';

const STYLES: Record<SentimentLabel, string> = {
  Positive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Neutral: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Negative: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const DOTS: Record<SentimentLabel, string> = {
  Positive: 'bg-emerald-400',
  Neutral: 'bg-amber-400',
  Negative: 'bg-rose-400',
};

export function SentimentBadge({
  sentiment,
  size = 'sm',
}: {
  sentiment: SentimentLabel | string;
  size?: 'xs' | 'sm' | 'lg';
}) {
  const key = (sentiment in STYLES ? sentiment : 'Neutral') as SentimentLabel;
  const sizeClass =
    size === 'lg'
      ? 'px-4 py-1.5 text-sm font-semibold gap-2'
      : size === 'xs'
        ? 'px-2 py-0.5 text-[11px] font-medium gap-1.5'
        : 'px-2.5 py-1 text-xs font-medium gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${STYLES[key]} ${sizeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[key]}`} />
      {sentiment}
    </span>
  );
}

