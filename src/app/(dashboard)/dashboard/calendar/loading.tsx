export default function CalendarPageLoading() {
  return (
    <div className="loading-shell space-y-4">
      {/* 月ナビ・週表示のスケルトン */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="h-9 w-32 animate-pulse rounded-md bg-accent-200/80 dark:bg-accent-800/60" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
        </div>
      </div>
      {/* カレンダーグリッド風（7列×5行程度） */}
      <div className="grid grid-cols-7 gap-1 rounded-xl border border-zinc-200 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
          <div key={d} className="h-6 animate-pulse rounded-md bg-accent-100/60 dark:bg-accent-900/30" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-md bg-accent-50/70 dark:bg-accent-950/25"
          />
        ))}
      </div>
      {/* 下段パネル風 */}
      <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-accent-50/50 dark:border-zinc-800 dark:bg-accent-950/20" />
    </div>
  );
}
