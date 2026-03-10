import dayjs from "dayjs";
import "dayjs/locale/ja";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import {
  getScheduleEntriesInRange,
  type ScheduleEntryRow,
} from "@/lib/data/schedule-entries";
import { saveScheduleEntry } from "../actions";
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
      // holiday-jp の結果は型的に any 扱いになるので toString だけしておく
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((await import("holiday-jp")).isHoliday(cursor.toDate()) as any | null)?.name ??
      null;

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

  return (
    <CalendarWithModal
      calendarName={calendar.name ?? "メインカレンダー"}
      monthLabel={today.format("YYYY年 M月")}
      calendarId={calendar.id}
      days={days}
      saveAction={saveScheduleEntry}
    />
  );
}

