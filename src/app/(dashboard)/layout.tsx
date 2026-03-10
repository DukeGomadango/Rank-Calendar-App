import Link from "next/link";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 flex-col border-r border-zinc-200 bg-white/80 px-4 py-6 text-sm shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex">
        <div className="mb-6 text-xs font-semibold tracking-wide text-pink-500">
          IRIAM rank planner
        </div>
        <nav className="space-y-2 text-zinc-700 dark:text-zinc-200">
          <Link
            href="/dashboard"
            className="block rounded-md px-2 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ホーム
          </Link>
          <Link
            href="/dashboard/calendar"
            className="block rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            カレンダー
          </Link>
          <Link
            href="/dashboard/data"
            className="block rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            データ
          </Link>
          <Link
            href="/dashboard/settings"
            className="block rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            設定
          </Link>
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}

