"use client";

import { useRef } from "react";
import { EVENT_PALETTE } from "@/lib/event-colors";

const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ranking", label: "ランキング" },
  { value: "achievement", label: "達成" },
  { value: "background", label: "背景" },
  { value: "other", label: "その他" },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Props = {
  calendarId: string;
  createAction: (formData: FormData) => Promise<void>;
};

export function EventFormClient({ calendarId, createAction }: Props) {
  const endDateRef = useRef<HTMLInputElement>(null);

  function handleStartDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const start = e.target.value;
    if (!start || !endDateRef.current) return;
    endDateRef.current.value = addDays(start, 6);
  }

  return (
    <form action={createAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">イベント名</span>
        <input
          type="text"
          name="name"
          required
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="例）3月度ランキング、駅ポス etc."
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">開始日（任意）</span>
        <input
          type="date"
          name="start_date"
          onChange={handleStartDateChange}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">終了日（任意）開始日＋6日で自動入力</span>
        <input
          ref={endDateRef}
          type="date"
          name="end_date"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <div className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">色（カレンダー帯に反映）</span>
        <div className="flex flex-wrap gap-2">
          {EVENT_PALETTE.map((c) => (
            <label key={c.id} className="relative cursor-pointer">
              <input type="radio" name="color" value={c.id} className="sr-only peer" defaultChecked={c.id === "rose"} />
              <span
                className={`inline-flex h-8 w-8 rounded-full border-2 border-transparent ${c.swatch} peer-checked:ring-2 peer-checked:ring-zinc-800 peer-checked:ring-offset-2 dark:peer-checked:ring-zinc-200`}
                title={c.label}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">種類</span>
        <select
          name="event_type"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">指定なし</option>
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 dark:focus:ring-offset-zinc-900"
        >
          追加する
        </button>
      </div>
    </form>
  );
}
