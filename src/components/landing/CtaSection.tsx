import Link from "next/link";

export function CtaSection() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl rounded-3xl bg-accent-800 px-8 py-14 text-center dark:bg-accent-900">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          今すぐ、ランク管理をはじめる
        </h2>
        <p className="mt-4 text-slate-200 dark:text-slate-300">
          無料でアカウント作成。カレンダーとデータ表でスケジュールを一元管理できます。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-amber-400 px-8 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-amber-300 dark:bg-amber-400 dark:text-slate-900 dark:hover:bg-amber-300"
          >
            無料ではじめる
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-white/60 px-8 text-base font-medium text-white transition hover:bg-white/15 dark:border-white/50 dark:hover:bg-white/10"
          >
            ログイン
          </Link>
        </div>
      </div>
    </section>
  );
}
