"use client";

import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300"
        >
          IRIAM だんごスケジュール
        </Link>
        <nav className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300"
          >
            新規登録
          </Link>
        </nav>
      </div>
    </header>
  );
}
