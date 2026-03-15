export default function EventsPageLoading() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="h-6 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </header>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
