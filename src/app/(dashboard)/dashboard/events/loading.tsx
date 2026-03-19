export default function EventsPageLoading() {
  return (
    <div className="loading-shell space-y-4">
      <header className="space-y-1">
        <div className="h-6 w-28 animate-pulse rounded-md bg-accent-200/80 dark:bg-accent-800/60" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
      </header>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="h-4 w-32 animate-pulse rounded-md bg-accent-200/70 dark:bg-accent-800/50" />
        <div className="h-10 w-full animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-accent-100/70 dark:bg-accent-900/40" />
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="h-4 w-28 animate-pulse rounded-md bg-accent-200/70 dark:bg-accent-800/50" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-accent-50/80 dark:bg-accent-950/30"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
