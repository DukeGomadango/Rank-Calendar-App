import dayjs from "dayjs";
import "dayjs/locale/ja";

import { toJstDateString } from "@/lib/domain/calendar";
import { CalendarPageClient } from "./CalendarPageClient";
import {
  deleteCalendarSchedule,
  moveScheduleEntry,
  redoCalendarScheduleChange,
  resizeCalendarSchedule,
  shiftCalendarSchedule,
  saveCalendarSchedule,
  saveScheduleEntry,
  undoCalendarScheduleChange,
} from "../actions";

function parseMonthParam(month?: string | string[]): dayjs.Dayjs {
  const raw = typeof month === "string" ? month : Array.isArray(month) ? month[0] : undefined;
  const jstFallback = () => dayjs(toJstDateString(new Date()), "YYYY-MM-DD");
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return jstFallback();
  const parsed = dayjs(raw, "YYYY-MM", true);
  return parsed.isValid() ? parsed : jstFallback();
}

/** week=YYYY-MM-DD の週の日曜日を返す。不正なら今月15日を含む週の日曜。 */
function parseWeekParam(displayMonth: dayjs.Dayjs, week?: string | string[]): string {
  const raw = typeof week === "string" ? week : Array.isArray(week) ? week[0] : undefined;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = dayjs(raw, "YYYY-MM-DD", true);
    if (parsed.isValid()) return parsed.startOf("week").format("YYYY-MM-DD");
  }
  const ref = displayMonth.date(15);
  return ref.startOf("week").format("YYYY-MM-DD");
}

type PageProps = {
  searchParams?: Promise<{ month?: string; week?: string; calendarId?: string }> | { month?: string; week?: string; calendarId?: string };
};

export default async function CalendarPage(props: PageProps) {
  const rawSp = props.searchParams;
  const resolvedSp: { month?: string; week?: string; calendarId?: string } =
    rawSp && typeof (rawSp as Promise<unknown>).then === "function"
      ? await (rawSp as Promise<{ month?: string; week?: string; calendarId?: string }>)
      : (rawSp ?? {}) as { month?: string; week?: string; calendarId?: string };
  let displayMonth = parseMonthParam(resolvedSp.month);
  const currentWeekStart = parseWeekParam(displayMonth, resolvedSp.week);
  if (resolvedSp.week && /^\d{4}-\d{2}-\d{2}$/.test(resolvedSp.week) && dayjs(resolvedSp.week, "YYYY-MM-DD", true).isValid()) {
    displayMonth = dayjs(currentWeekStart).startOf("month");
  }
  const currentMonthParam = displayMonth.format("YYYY-MM");

  return (
    <CalendarPageClient
      initialMonth={currentMonthParam}
      initialWeekStart={currentWeekStart}
      saveEntryAction={saveScheduleEntry}
      moveEntryAction={moveScheduleEntry}
      saveScheduleAction={saveCalendarSchedule}
      deleteScheduleAction={deleteCalendarSchedule}
      shiftScheduleAction={shiftCalendarSchedule}
      resizeScheduleAction={resizeCalendarSchedule}
      undoScheduleAction={undoCalendarScheduleChange}
      redoScheduleAction={redoCalendarScheduleChange}
    />
  );
}

