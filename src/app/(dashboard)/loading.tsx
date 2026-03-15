export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1">
        <aside className="hidden w-56 flex-col border-r border-zinc-200 bg-white/80 px-4 py-6 dark:border-zinc-800 dark:bg-slate-800/95 sm:flex">
          <div className="mb-6 h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <nav className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-8 w-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-4 pb-16 pt-4 sm:px-8 sm:pb-6 sm:pt-6 sm:pr-14">
          <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-8 h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </main>
      </div>
    </div>
  );
}
