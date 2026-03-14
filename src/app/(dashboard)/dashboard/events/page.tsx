import dayjs from "dayjs";
import "dayjs/locale/ja";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar, type EventRow } from "@/lib/data/events";
import { getMockEvents } from "@/lib/mock-seed-data";
import {
  createEvent,
  deleteEventAction,
  noopCreateEvent,
  noopDeleteEventAction,
} from "./actions";
import { EventFormClient } from "@/components/events/EventFormClient";
import { EventCard } from "@/components/events/EventCard";

dayjs.locale("ja");

const todayStr = () => dayjs().format("YYYY-MM-DD");

function splitActivePast(events: EventRow[]): { active: EventRow[]; past: EventRow[] } {
  const today = todayStr();
  const active: EventRow[] = [];
  const past: EventRow[] = [];
  for (const e of events) {
    const end = e.end_date ?? e.start_date ?? "";
    if (end >= today) active.push(e);
    else past.push(e);
  }
  active.sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  past.sort((a, b) => (b.end_date ?? b.start_date ?? "").localeCompare(a.end_date ?? a.start_date ?? ""));
  return { active, past };
}

export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const events = getMockEvents();
    const { active, past } = splitActivePast(events);
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。カレンダーと同じモックイベントを表示しています。</p>
        </section>
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">イベント</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {calendar.name ?? "メインカレンダー"} 用のイベント一覧です。スケジュール入力時の「参加イベント」から選択できます。
          </p>
        </header>
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">イベントを追加</h2>
          <EventFormClient calendarId={calendar.id} createAction={noopCreateEvent} />
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
                      <EventCard event={event} calendarId={calendar.id} deleteAction={noopDeleteEventAction} isPast={false} />
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
                      <EventCard event={event} calendarId={calendar.id} deleteAction={noopDeleteEventAction} isPast />
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

  if (!user) redirect("/login");
  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const events = await listEventsForCalendar(calendar.id);
  const { active, past } = splitActivePast(events);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">イベント</h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {calendar.name ?? "メインカレンダー"} 用のイベント一覧です。スケジュール入力時の「参加イベント」から選択できます。
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">イベントを追加</h2>
        <EventFormClient calendarId={calendar.id} createAction={createEvent} />
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">イベント一覧</h2>
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">まだイベントがありません</p>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              イベントを追加すると、スケジュール登録時の「参加イベント」から選べます。上のフォームで追加しましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">進行中・予定</h3>
              {active.length === 0 ? (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">該当するイベントはありません。</p>
              ) : (
                <ul className="space-y-2">
                  {active.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} calendarId={calendar.id} deleteAction={deleteEventAction} isPast={false} />
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
                      <EventCard event={event} calendarId={calendar.id} deleteAction={deleteEventAction} isPast />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
