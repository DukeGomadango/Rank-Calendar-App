"use client";

import { useState } from "react";
import type { EventRow } from "@/lib/data/events";
import { EVENT_PALETTE } from "@/lib/event-colors";

type Props = {
  event: EventRow;
  calendarId: string;
  updateAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
};

export function EventsListEventEditModal({
  event,
  calendarId,
  updateAction,
  onClose,
}: Props) {
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    try {
      await updateAction(formData);
      onClose();
    } catch {
      // エラーはサーバー側のrevalidateとトーストに任せる
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-3 py-6">
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">イベントを編集</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="calendar_id" value={calendarId} />
          <input type="hidden" name="id" value={event.id} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">イベント名</span>
            <input
              type="text"
              name="name"
              defaultValue={event.name}
              required
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">開始日（任意）</span>
              <input
                type="date"
                name="start_date"
                defaultValue={event.start_date ?? undefined}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">終了日（任意）</span>
              <input
                type="date"
                name="end_date"
                defaultValue={event.end_date ?? undefined}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">色（カレンダー帯に反映）</span>
            <div className="flex flex-wrap gap-2">
              {EVENT_PALETTE.map((c) => (
                <label key={c.id} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c.id}
                    className="sr-only peer"
                    defaultChecked={c.id === (event.color ?? "rose")}
                  />
                  <span
                    className={`inline-flex h-7 w-7 rounded-full border-2 border-transparent ${c.swatch} peer-checked:ring-2 peer-checked:ring-zinc-800 peer-checked:ring-offset-2 dark:peer-checked:ring-zinc-200`}
                    title={c.label}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => !pending && onClose()}
              className="rounded-md px-3 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-accent-600 disabled:opacity-60 dark:bg-accent-500 dark:hover:bg-accent-600"
            >
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
