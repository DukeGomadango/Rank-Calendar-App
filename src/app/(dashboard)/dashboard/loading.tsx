export default function DashboardHomeLoading() {
  return (
    <div className="space-y-6">
      <section>
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </section>
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8 lg:items-start">
        <div className="space-y-6">
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800 lg:sticky lg:top-6" />
      </div>
    </div>
  );
}
