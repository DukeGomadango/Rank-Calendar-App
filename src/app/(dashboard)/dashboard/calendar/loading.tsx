export default function CalendarPageLoading() {
  return (
    <div className="space-y-4">
      {/* 月ナビ・週表示のスケルトン */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="h-9 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      {/* カレンダーグリッド風（7列×5行程度） */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
        {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
          <div key={d} className="h-6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
      {/* 右側モーダル風パネル */}
      <div className="mt-4 h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
