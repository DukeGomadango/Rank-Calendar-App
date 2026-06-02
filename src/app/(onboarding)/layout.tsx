import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ToastProvider } from "@/lib/toast-context";

type Props = {
  children: ReactNode;
};

/** セットアップウィザード専用の最小シェル（フルナビ・DashboardProvider なし） */
export default function OnboardingLayout({ children }: Props) {
  return (
    <ToastProvider>
      <div className="onboarding-root flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-4 py-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-slate-800/95">
          <span className="text-[11px] font-semibold tracking-wide text-accent-500">
            IRIAM だんごスケジュール
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              ホームへ
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
