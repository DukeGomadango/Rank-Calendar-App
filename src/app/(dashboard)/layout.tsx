import Link from "next/link";
import type { ReactNode } from "react";

import { ToastProvider } from "@/lib/toast-context";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DashboardHamburgerNav } from "@/components/layout/DashboardHamburgerNav";
import { MockRoleSwitcher } from "@/components/mock/MockRoleSwitcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasOwnedCalendar } from "@/lib/data/calendars";
import { toJstDateString } from "@/lib/domain/calendar";
import { getMockSeedEntries } from "@/lib/mock-seed-data";
import { MockScheduleProvider } from "@/lib/mock-schedule-context";
import { ViewModeProvider } from "@/lib/view-mode-context";
import { MOCK_ROLE_COOKIE } from "@/lib/auth/mock-role-cookie";
import { cookies } from "next/headers";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const initialEntries =
    process.env.NODE_ENV === "development"
      ? getMockSeedEntries(toJstDateString(new Date()))
      : undefined;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let showMockRoleSwitcher = false;
  let mockRole: "owner" | "listener" = "owner";
  let isOwner = false;

  if (user) {
    isOwner = await hasOwnedCalendar(user.id);
  } else if (process.env.NODE_ENV === "development") {
    showMockRoleSwitcher = true;
    const cookieStore = await cookies();
    mockRole = cookieStore.get(MOCK_ROLE_COOKIE)?.value === "listener" ? "listener" : "owner";
    isOwner = mockRole === "owner";
  }

  return (
    <MockScheduleProvider initialEntries={initialEntries}>
    <ViewModeProvider>
    <ToastProvider>
    <div className="flex min-h-screen flex-col bg-background">
      {/* PC: 画面右上に固定（サイドバー表示時のみ。sm〜lg はハンバーガーバー内に ThemeToggle） */}
      <div className="fixed top-4 right-4 z-50 hidden flex-wrap items-center justify-end gap-2 lg:flex">
        {showMockRoleSwitcher && <MockRoleSwitcher currentRole={mockRole} />}
        <ThemeToggle />
      </div>

      {/* モバイル: 上部ヘッダー（テーマ切替を内側に配置してかぶり防止） */}
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-4 py-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-slate-800/95 sm:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold tracking-wide text-accent-500">
            IRIAM だんごスケジュール
          </span>
          <span className="text-[11px] text-zinc-700 dark:text-zinc-200">
            ダッシュボード
          </span>
        </div>
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

      <div className="flex flex-1 flex-col">
        {/* 横長（sm〜lg）: ハンバーガーバー＋ドロワー。lg 以上はサイドバー表示のため非表示 */}
        <DashboardHamburgerNav isOwner={isOwner} />
        <div className="flex flex-1">
          {/* PC: 左サイドバー（lg 以上のみ。スマホ横向きでは非表示でカレンダー全幅） */}
          <aside className="hidden w-56 flex-col border-r border-zinc-200 bg-white/80 px-4 py-6 text-sm shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-slate-800/95 lg:flex">
          <div className="mb-6 text-xs font-semibold tracking-wide text-accent-500">
            IRIAM だんごスケジュール
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
              href="/dashboard/events"
              className="block rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              イベント
            </Link>
            {isOwner && (
              <Link
                href="/dashboard/sharing"
                className="block rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                共有
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              className="block rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              設定
            </Link>
          </nav>
        </aside>

          <main className="flex-1 px-4 pb-16 pt-4 sm:px-8 sm:pb-6 sm:pt-6 lg:pr-14">
            {children}
          </main>
        </div>
      </div>

      {/* モバイル: ボトムナビゲーション */}
      <nav className="sticky bottom-0 border-t border-zinc-200 bg-white/90 px-2 py-1.5 text-[11px] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] backdrop-blur dark:border-zinc-800 dark:bg-slate-800/95 sm:hidden">
        <ul className="flex items-stretch justify-between gap-1">
          <li className="flex-1">
            <Link
              href="/dashboard"
              className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="text-[10px] font-medium">ホーム</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              href="/dashboard/calendar"
              className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="text-[10px] font-medium">カレンダー</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              href="/dashboard/data"
              className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="text-[10px] font-medium">データ</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link
              href="/dashboard/events"
              className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="text-[10px] font-medium">イベント</span>
            </Link>
          </li>
          {isOwner && (
            <li className="flex-1">
              <Link
                href="/dashboard/sharing"
                className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <span className="text-[10px] font-medium">共有</span>
              </Link>
            </li>
          )}
          <li className="flex-1">
            <Link
              href="/dashboard/settings"
              className="flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="text-[10px] font-medium">設定</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
    </ToastProvider>
    </ViewModeProvider>
    </MockScheduleProvider>
  );
}

