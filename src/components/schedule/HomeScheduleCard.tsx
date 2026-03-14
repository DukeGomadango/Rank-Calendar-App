"use client";

import { useState } from "react";

import { ScheduleForm } from "./ScheduleForm";

type Props = {
  calendarId: string;
  defaultDate: string;
  action: (formData: FormData) => void;
  events: { id: string; name: string }[];
};

export function HomeScheduleCard({
  calendarId,
  defaultDate,
  action,
  events,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl border border-zinc-200 bg-white/80 p-4 text-left text-xs shadow-sm backdrop-blur transition hover:border-pink-200 hover:bg-pink-50/50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-pink-800 dark:hover:bg-pink-950/30"
      >
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          今日のスケジュールを登録
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-labelledby="home-schedule-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="home-schedule-modal-title"
                className="text-xs font-semibold text-zinc-900 dark:text-zinc-50"
              >
                今日のスケジュールを登録
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
