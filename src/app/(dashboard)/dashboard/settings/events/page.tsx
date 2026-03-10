import dayjs from "dayjs";
import "dayjs/locale/ja";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar } from "@/lib/data/events";
import { createEvent, deleteEventAction } from "./actions";

dayjs.locale("ja");

export default async function EventsSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const events = await listEventsForCalendar(calendar.id);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          イベントマスタ
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {calendar.name ?? "メインカレンダー"} 用のイベント一覧です。スケジュール入力時の「参加イベント」から選択できます。
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          イベントを追加
        </h2>
        <form action={createEvent} className="grid gap-2 md:grid-cols-4">
          <input type="hidden" name="calendar_id" value={calendar.id} />
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              イベント名
            </span>
            <input
              type="text"
              name="name"
              required
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="例）3月度ランキング、駅ポス etc."
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              開始日（任意）
            </span>
            <input
              type="date"
              name="start_date"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              終了日（任意）
            </span>
            <input
              type="date"
              name="end_date"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md bg-pink-500 px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-1 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-900"
            >
              追加する
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          イベント一覧
        </h2>
        {events.length === 0 ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            まだイベントが登録されていません。上のフォームから追加できます。
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {event.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {event.start_date
                      ? dayjs(event.start_date).format("YYYY/MM/DD")
                      : "開始日未設定"}
                    {" 〜 "}
                    {event.end_date
                      ? dayjs(event.end_date).format("YYYY/MM/DD")
                      : "終了日未設定"}
                  </p>
                </div>
                <form action={deleteEventAction}>
                  <input type="hidden" name="calendar_id" value={calendar.id} />
                  <input type="hidden" name="id" value={event.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

