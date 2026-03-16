export default function DataPageLoading() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="h-6 w-24 animate-pulse rounded-md bg-accent-200/80 dark:bg-accent-800/60" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
      </header>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {["日付", "曜日", "目標+", "実績+", "メモ"].map((label) => (
                <th key={label} className="border-b border-zinc-200 px-2 py-2 text-left dark:border-zinc-700">
                  <div className="h-3 w-12 animate-pulse rounded bg-accent-200/70 dark:bg-accent-800/50" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="bg-white dark:bg-zinc-900/80">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="border-b border-zinc-100 px-2 py-2 dark:border-zinc-800">
                    <div className="h-4 w-14 animate-pulse rounded-md bg-accent-50/80 dark:bg-accent-950/30" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
