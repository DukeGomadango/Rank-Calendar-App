"use client";

import { useState } from "react";

import { SparklesIcon } from "@/components/icons/DashboardIcons";
import { ScheduleForm } from "./ScheduleForm";

type TodayEntry = {
  target_plus?: number | null;
  actual_plus?: number | null;
  ansuko_baseline?: number | null;
  border_plus2?: number | null;
  border_plus4?: number | null;
  border_plus6?: number | null;
  event_id?: string | null;
  memo?: string | null;
  skip_pass_used?: boolean;
};

type Props = {
  /** ダッシュボードでは "inline"（常設）、カレンダー等では "modal"（従来のボタン→モーダル） */
  variant?: "inline" | "modal";
  calendarId: string;
  defaultDate: string;
  action: (formData: FormData) => void;
  events: { id: string; name: string }[];
  /** 今日の既存エントリ（inline 時の初期値・モーダルでは未使用） */
  todayEntry?: TodayEntry | null;
};

export function HomeScheduleCard({
  variant = "modal",
  calendarId,
  defaultDate,
  action,
  events,
  todayEntry,
}: Props) {
  const [open, setOpen] = useState(false);

  if (variant === "inline") {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-md dark:bg-slate-800">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          <span className="inline-flex h-4 w-4 items-center justify-center text-accent-500">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <span>今日のスケジュールを登録</span>
        </h2>
        <ScheduleForm
          calendarId={calendarId}
          defaultDate={defaultDate}
          action={action}
          events={events}
          defaultTargetPlus={todayEntry?.target_plus}
          defaultActualPlus={todayEntry?.actual_plus}
          defaultAnsukoBaseline={todayEntry?.ansuko_baseline}
          defaultBorderPlus2={todayEntry?.border_plus2}
          defaultBorderPlus4={todayEntry?.border_plus4}
          defaultBorderPlus6={todayEntry?.border_plus6}
          defaultEventId={todayEntry?.event_id}
          defaultMemo={todayEntry?.memo}
          defaultSkipPassUsed={todayEntry?.skip_pass_used}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-2xl bg-white p-4 text-left text-xs shadow-md transition hover:bg-accent-50/70 dark:bg-slate-800 dark:hover:bg-accent-950/30"
      >
        <span className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
          <span className="inline-flex h-4 w-4 items-center justify-center text-accent-500">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <span>今日のスケジュールを登録</span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-labelledby="home-schedule-modal-title"
        >
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-4 text-xs shadow-xl dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="home-schedule-modal-title"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-50"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center text-accent-500">
                  <SparklesIcon className="h-4 w-4" />
                </span>
                <span>今日のスケジュールを登録</span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                閉じる
              </button>
            </div>

            <ScheduleForm
              calendarId={calendarId}
              defaultDate={defaultDate}
              action={action}
              events={events}
            />
          </div>
        </div>
      )}
    </>
  );
}
