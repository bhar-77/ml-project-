export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel h-28 animate-pulse rounded-2xl bg-slate-800/30" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-panel h-48 animate-pulse rounded-2xl bg-slate-800/25" />
      ))}
    </div>
  );
}

