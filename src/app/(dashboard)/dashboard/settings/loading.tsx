export default function SettingsPageLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
        設定を読み込み中…
      </div>
      <header className="space-y-1">
        <div className="h-6 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </header>
      <section className="rounded-2xl bg-white p-4 shadow-md dark:bg-slate-800">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-md dark:bg-slate-800">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-md dark:bg-slate-800">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-10 w-32 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-md dark:bg-slate-800">
        <div className="h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-3 h-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </section>
    </div>
  );
}
