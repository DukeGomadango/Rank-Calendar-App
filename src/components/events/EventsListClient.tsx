"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EventRow, EventType } from "@/lib/data/events";
import { EVENT_PALETTE } from "@/lib/event-colors";
import { useToast } from "@/lib/toast-context";
import { EventCalendarOcrImporter } from "@/components/ocr/EventCalendarOcrImporter";
import { EventFormClient } from "./EventFormClient";
import { EventCard } from "./EventCard";

type Props = {
  initialActive: EventRow[];
  initialPast: EventRow[];
  calendarId: string;
  calendarName: string | null;
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
};

export function EventsListClient({
  initialActive,
  initialPast,
  calendarId,
  calendarName,
  createAction,
  deleteAction,
  updateAction,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [active, setActive] = useState<EventRow[]>(initialActive);
  const [past, setPast] = useState<EventRow[]>(initialPast);
  const [listError, setListError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventRow | null>(null);

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

  const handleEditRequest = (event: EventRow) => {
    setEditing(event);
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

      <EventCalendarOcrImporter calendarId={calendarId} createAction={createAction} />

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
                      onEditRequest={handleEditRequest}
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
                      onEditRequest={handleEditRequest}
                      isPast
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </section>

      {editing && (
        <EventEditModal
          event={editing}
          calendarId={calendarId}
          onClose={() => setEditing(null)}
          updateAction={updateAction}
        />
      )}
    </div>
  );
}

type EditModalProps = {
  event: EventRow;
  calendarId: string;
  updateAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
};

function EventEditModal({ event, calendarId, updateAction, onClose }: EditModalProps) {
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
