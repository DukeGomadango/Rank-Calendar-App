"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Props = { isOwner: boolean };

export function DashboardHamburgerNav({ isOwner }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 横長画面（sm〜lg）用: ハンバーガーバー。サイドバーは lg 以上で表示するため、この幅帯ではバー＋ドロワー */}
      <header className="hidden shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 py-2 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-slate-800/95 sm:flex lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
          aria-label="メニューを開く"
        >
          <span className="text-lg leading-none" aria-hidden>☰</span>
        </button>
        <span className="min-w-0 truncate text-[11px] font-semibold tracking-wide text-accent-500">
          IRIAM だんごスケジュール
        </span>
        <ThemeToggle />
      </header>

      {/* ドロワー: オーバーレイ ＋ 左からパネル */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 z-50 flex h-full w-56 flex-col border-r border-zinc-200 bg-white/95 px-4 py-6 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-slate-800/95"
            role="dialog"
            aria-label="メニュー"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-accent-500">
                IRIAM だんごスケジュール
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                閉じる
              </button>
            </div>
            <nav className="space-y-1 text-zinc-700 dark:text-zinc-200">
              <Link
                href="/dashboard"
                className="block rounded-md px-2 py-2 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                ホーム
              </Link>
              <Link
                href="/dashboard/calendar"
                className="block rounded-md px-2 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                カレンダー
              </Link>
              <Link
                href="/dashboard/data"
                className="block rounded-md px-2 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                データ
              </Link>
              <Link
                href="/dashboard/events"
                className="block rounded-md px-2 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                イベント
              </Link>
              {isOwner && (
                <Link
                  href="/dashboard/sharing"
                  className="block rounded-md px-2 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => setOpen(false)}
                >
                  共有
                </Link>
              )}
              <Link
                href="/dashboard/settings"
                className="block rounded-md px-2 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                設定
              </Link>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
