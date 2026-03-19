export default function DashboardHomeLoading() {
  return (
    <div className="loading-shell space-y-6">
      <div className="rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        ダッシュボードを読み込み中…
      </div>
      <section>
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </section>
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8 lg:items-start">
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800 lg:sticky lg:top-6" />
      </div>
    </div>
  );
}
