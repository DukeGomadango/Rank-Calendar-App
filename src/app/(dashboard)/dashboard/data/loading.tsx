export default function DataPageLoading() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="h-6 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </header>
      <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-8 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-8 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
