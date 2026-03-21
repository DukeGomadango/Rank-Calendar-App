"use client";

import type { ViewMode } from "@/lib/view-mode-context";

export type CalendarToolbarProps = {
  monthLabel: string;
  calendarName: string;
  view: "month" | "week";
  onViewChange: (view: "month" | "week") => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isNavigating: boolean;
  prevMonthParam: string;
  nextMonthParam: string;
  prevWeekMonth: string;
  prevWeekStart: string;
  nextWeekMonth: string;
  nextWeekStart: string;
  onGoToMonth: (month: string) => void;
  onGoToWeek: (month: string, weekStart: string) => void;
};

export function CalendarToolbar({
  monthLabel,
  calendarName,
  view,
  onViewChange,
  viewMode,
  onViewModeChange,
  isNavigating,
  prevMonthParam,
  nextMonthParam,
  prevWeekMonth,
  prevWeekStart,
  nextWeekMonth,
  nextWeekStart,
  onGoToMonth,
  onGoToWeek,
}: CalendarToolbarProps) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2 md:flex-row md:items-center md:gap-3">
      <div className="min-w-0 md:shrink-0">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">カレンダー</h1>
        <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">{monthLabel}</p>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          {calendarName} のスケジュールを表示しています。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
        <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1 text-[11px] text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
          <button
            type="button"
            onClick={() => onViewChange("month")}
            className={`rounded-full px-3 py-1 ${
              view === "month"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : ""
            }`}
          >
            月
          </button>
          <button
            type="button"
            onClick={() => onViewChange("week")}
            className={`rounded-full px-3 py-1 ${
              view === "week"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : ""
            }`}
          >
            週
          </button>
        </div>
        <nav className="flex items-center gap-0.5 text-zinc-700 dark:text-zinc-200">
          {view === "month" ? (
            <>
              <button
                type="button"
                onClick={() => onGoToMonth(prevMonthParam)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                aria-label="前月"
                disabled={isNavigating}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onGoToMonth(nextMonthParam)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                aria-label="次月"
                disabled={isNavigating}
              >
                ›
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onGoToWeek(prevWeekMonth, prevWeekStart)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                aria-label="前週"
                disabled={isNavigating}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onGoToWeek(nextWeekMonth, nextWeekStart)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                aria-label="次週"
                disabled={isNavigating}
              >
                ›
              </button>
            </>
          )}
        </nav>
        <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-0.5 text-[10px] dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => onViewModeChange("simple")}
            className={`rounded-full px-2 py-1 font-medium ${
              viewMode === "simple"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            title="目標・実績・イベントのみ表示"
          >
            簡易
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("detailed")}
            className={`rounded-full px-2 py-1 font-medium ${
              viewMode === "detailed"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            title="ボーダー（+2/+4/+6）も表示"
          >
            詳細
          </button>
        </div>
      </div>
    </header>
  );
}
