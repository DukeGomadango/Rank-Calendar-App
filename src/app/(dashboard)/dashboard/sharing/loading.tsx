export default function SharingPageLoading() {
  return (
    <div className="loading-shell space-y-6">
      <div className="rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        共有設定を読み込み中…
      </div>
      <header className="space-y-1">
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </header>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 space-y-2">
          <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 space-y-2">
          {[1].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
