"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EventRow, EventType } from "@/lib/data/events";
import { useToast } from "@/lib/toast-context";
import { EventFormClient } from "./EventFormClient";
import { EventCard } from "./EventCard";

type Props = {
  initialActive: EventRow[];
  initialPast: EventRow[];
  calendarId: string;
  calendarName: string | null;
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function EventsListClient({
  initialActive,
  initialPast,
  calendarId,
  calendarName,
  createAction,
  deleteAction,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [active, setActive] = useState<EventRow[]>(initialActive);
  const [past, setPast] = useState<EventRow[]>(initialPast);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    setActive(initialActive);
    setPast(initialPast);
  }, [initialActive, initialPast]);

  const handleCreate = async (formData: FormData) => {
    const name = (formData.get("name") as string)?.trim() ?? "";
    const start_date = (formData.get("start_date") as string) || null;
    const end_date = (formData.get("end_date") as string) || null;
    const color = (formData.get("color") as string) || null;
    const eventType = (formData.get("event_type") as string) || null;
    const tempId = `temp-${Date.now()}`;
    const temp: EventRow = {
      id: tempId,
      name: name || "（追加中…）",
      start_date: start_date || null,
      end_date: end_date || null,
      color: color || null,
      event_type: (eventType as EventType) || null,
    };
    setListError(null);
    setActive((prev) => [temp, ...prev]);
    try {
      await createAction(formData);
      router.refresh();
      showToast("イベントを追加しました");
    } catch {
      setActive((prev) => prev.filter((e) => e.id !== tempId));
      setListError("追加に失敗しました");
    }
  };

  const handleDeleteRequest = (id: string) => {
    const fromActive = active.find((e) => e.id === id);
    const fromPast = past.find((e) => e.id === id);
    const removed = fromActive ?? fromPast;
    if (!removed) return;
    setListError(null);
    if (fromActive) setActive((prev) => prev.filter((e) => e.id !== id));
    if (fromPast) setPast((prev) => prev.filter((e) => e.id !== id));
    const fd = new FormData();
    fd.set("calendar_id", calendarId);
    fd.set("id", id);
    deleteAction(fd)
      .then(() => {
        router.refresh();
        showToast("イベントを削除しました");
      })
      .catch(() => {
        if (fromActive) setActive((prev) => [removed, ...prev]);
        if (fromPast) setPast((prev) => [...prev, removed]);
        setListError("削除に失敗しました");
      });
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">イベント</h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {calendarName ?? "メインカレンダー"} 用のイベント一覧です。スケジュール入力時の「参加イベント」から選択できます。
        </p>
      </header>

      {listError && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {listError}
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">イベントを追加</h2>
        <EventFormClient calendarId={calendarId} createAction={createAction} onSubmit={handleCreate} />
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">イベント一覧</h2>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">進行中・予定</h3>
            {active.length === 0 ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">該当するイベントはありません。</p>
            ) : (
              <ul className="space-y-2">
                {active.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      calendarId={calendarId}
                      deleteAction={deleteAction}
                      onDeleteRequest={handleDeleteRequest}
                      isPast={false}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {past.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-[11px] font-medium text-zinc-500 dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1">過去のイベント（{past.length}件）</span>
              </summary>
              <ul className="mt-2 space-y-2">
                {past.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      calendarId={calendarId}
                      deleteAction={deleteAction}
                      onDeleteRequest={handleDeleteRequest}
                      isPast
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}
