import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ModelErrorBanner({
  title = 'ML Service Unavailable',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/35 bg-rose-950/35 p-5 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-rose-200/80">{message}</p>
            <p className="mt-2 font-mono text-xs text-rose-300/70">
              ReviewIQ strictly enforces real model inference and never falls back to synthetic or mock predictions.
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3.5 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

