import dayjs from "dayjs";
import "dayjs/locale/ja";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import {
  getScheduleEntriesInRange,
  type ScheduleEntryRow,
} from "@/lib/data/schedule-entries";
import { listEventsForCalendar } from "@/lib/data/events";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { saveScheduleEntry, moveScheduleEntry } from "../actions";
import { CalendarWithModal } from "@/components/schedule/CalendarWithModal";

dayjs.locale("ja");

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const permissions = await getCalendarPermissionsForUser(calendar.id, user.id);

  if (!permissions.canViewCalendar) {
    return (
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            カレンダー
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            このカレンダーを閲覧する権限がありません。オーナーに権限の付与を依頼してください。
          </p>
        </header>
      </div>
    );
  }

  const events = await listEventsForCalendar(calendar.id);

  const today = dayjs();
  const monthStart = today.startOf("month");
  const monthEnd = today.endOf("month");

  const fromDate = monthStart.startOf("week").format("YYYY-MM-DD");
  const toDate = monthEnd.endOf("week").format("YYYY-MM-DD");

  const entries = await getScheduleEntriesInRange(calendar.id, fromDate, toDate);

  const entriesByDate = new Map<string, ScheduleEntryRow[]>();
  for (const entry of entries) {
    const list = entriesByDate.get(entry.date) ?? [];
    list.push(entry);
    entriesByDate.set(entry.date, list);
  }

  const days: {
    date: string;
    isToday: boolean;
    isCurrentMonth: boolean;
    weekday: number;
    holidayName: string | null;
    entries: ScheduleEntryRow[];
  }[] = [];

  let cursor = dayjs(fromDate);
  const end = dayjs(toDate);
  while (cursor.isSame(end) || cursor.isBefore(end)) {
    const dateStr = cursor.format("YYYY-MM-DD");
    const weekday = cursor.day();
    const isToday = cursor.isSame(today, "day");
    const isCurrentMonth = cursor.isSame(today, "month");
    const holidayName =
      (await import("holiday-jp")).isHoliday(cursor.toDate())?.name ?? null;

    days.push({
      date: dateStr,
      isToday,
      isCurrentMonth,
      weekday,
      holidayName,
      entries: entriesByDate.get(dateStr) ?? [],
    });

    cursor = cursor.add(1, "day");
  }

  const hasAnyEntries = entries.length > 0;

  return (
    <div className="space-y-4">
      {!hasAnyEntries && (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          <p>
            この期間にはまだスケジュールがありません。カレンダーの日付をタップして登録しましょう。
          </p>
        </section>
      )}
      <CalendarWithModal
        calendarName={calendar.name ?? "メインカレンダー"}
        monthLabel={today.format("YYYY年 M月")}
        calendarId={calendar.id}
        permissions={permissions}
        days={days}
        moveEntry={moveScheduleEntry}
        saveAction={saveScheduleEntry}
        events={events}
      />
    </div>
  );
}

