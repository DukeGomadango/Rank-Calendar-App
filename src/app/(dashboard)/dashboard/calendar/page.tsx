// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path='../../../../types/holiday-jp.d.ts' />
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCalendarForUser } from "@/lib/data/calendars";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import { addDays, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";
import { getMockEvents } from "@/lib/mock-seed-data";
import {
  getCalendarPermissionsForUser,
  getMockPermissions,
  type CalendarPermissionFlags,
} from "@/lib/auth/permission";
import {
  moveScheduleEntry,
  saveScheduleEntry,
  saveCalendarSchedule,
  deleteCalendarSchedule,
  noopMoveEntry,
  noopSaveEntry,
} from "../actions";
import { CalendarMockWrapper } from "@/components/schedule/CalendarMockWrapper";
import { CalendarWithDataProvider } from "@/components/schedule/CalendarWithDataProvider";

dayjs.locale("ja");

/** 日本の祝日ライブラリには含まれない（または別名で表現したい）記念日を付加する */
function getCustomDayLabel(cursor: dayjs.Dayjs): string | null {
  const monthDay = cursor.format("MM-DD");

  switch (monthDay) {
    case "01-01":
      // 元日（祝日）に加えて「正月」も併記したい
      return "正月";
    case "03-14":
      return "ホワイトデー";
    case "10-31":
      return "ハロウィン";
    case "12-25":
      return "クリスマス";
    case "12-31":
      return "大晦日";
    default:
      return null;
  }
}

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  const rawSp = props.searchParams;
  const resolvedSp: { month?: string; week?: string; calendarId?: string } =
    rawSp && typeof (rawSp as Promise<unknown>).then === "function"
      ? await (rawSp as Promise<{ month?: string; week?: string; calendarId?: string }>)
      : (rawSp ?? {}) as { month?: string; week?: string; calendarId?: string };
  const urlCalendarId = resolvedSp.calendarId ?? null;
  let displayMonth = parseMonthParam(resolvedSp.month);
  const currentWeekStart = parseWeekParam(displayMonth, resolvedSp.week);
  if (resolvedSp.week && /^\d{4}-\d{2}-\d{2}$/.test(resolvedSp.week) && dayjs(resolvedSp.week, "YYYY-MM-DD", true).isValid()) {
    displayMonth = dayjs(currentWeekStart).startOf("month");
  }
  const currentMonthLabel = displayMonth.format("YYYY年 M月");
  const currentMonthParam = displayMonth.format("YYYY-MM");

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const permissions = await getMockPermissions();
    const todayJst = toJstDateString(new Date());
    const events = getMockEvents(todayJst);
    const today = dayjs(todayJst);
    const cycleStart = getJstWeekStart(todayJst);
    const cycleEnd = addDays(cycleStart, 6);
    const currentRankCycle = {
      start: cycleStart,
      end: cycleEnd,
      rank: "A1" as string | null,
    };
    const rankCycleHistory = [
      {
        cycle_start_date: addDays(cycleStart, -7),
        cycle_end_date: addDays(cycleEnd, -7),
        rank_during: "A1" as string | null,
        cycle_total: 12,
      },
    ];
    const forecastLabel = "目標達成で → A2";
    const futureCyclesMock: { start: string; end: string; rank: string }[] = [
      {
        start: addDays(cycleEnd, 1),
        end: addDays(cycleEnd, 7),
        rank: "A2",
      },
    ];
    const monthStart = displayMonth.startOf("month");
    const monthEnd = displayMonth.endOf("month");
    const fromDate = monthStart.startOf("week").format("YYYY-MM-DD");
    const toDate = monthEnd.endOf("week").format("YYYY-MM-DD");
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
      const jpHoliday = (await import("holiday-jp")).isHoliday(cursor.toDate());
      const custom = getCustomDayLabel(cursor);
      const holidayName =
        jpHoliday?.name === "元日" && custom
          ? `${jpHoliday.name} / ${custom}`
          : jpHoliday?.name ?? custom;
      days.push({
        date: dateStr,
        isToday: cursor.isSame(today, "day"),
        isCurrentMonth: cursor.isSame(displayMonth, "month"),
        weekday: cursor.day(),
        holidayName,
        entries: [],
      });
      cursor = cursor.add(1, "day");
    }
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。データタブで入力した内容がカレンダーにも反映されます。</p>
        </section>
        <CalendarMockWrapper
          calendarName={calendar.name ?? "メインカレンダー"}
          monthLabel={currentMonthLabel}
          currentMonthParam={currentMonthParam}
          currentWeekStart={currentWeekStart}
          calendarId={calendar.id}
          permissions={permissions}
          days={days}
          moveEntry={noopMoveEntry}
          saveAction={noopSaveEntry}
          events={events}
          currentRankCycle={currentRankCycle}
          rankCycleHistory={rankCycleHistory}
          forecastLabel={forecastLabel}
          futureCycles={futureCyclesMock}
          todayJst={todayJst}
        />
      </div>
    );
  }

  if (!user) redirect("/login");
  const currentCalendar = await getCurrentCalendarForUser(user.id, urlCalendarId);
  if (!currentCalendar) redirect("/dashboard/settings");
  if (!urlCalendarId) {
    const q = new URLSearchParams({ calendarId: currentCalendar.id });
    if (resolvedSp.month) q.set("month", resolvedSp.month);
    if (resolvedSp.week) q.set("week", resolvedSp.week);
    redirect(`/dashboard/calendar?${q.toString()}`);
  }
  const permissions = await getCalendarPermissionsForUser(currentCalendar.id, user.id);

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

  return (
    <div className="space-y-4">
      <CalendarWithDataProvider
        calendarId={currentCalendar.id}
        calendarName={currentCalendar.name ?? "メインカレンダー"}
        initialMonth={currentMonthParam}
        initialWeekStart={currentWeekStart}
        permissions={permissions}
        saveEntryAction={saveScheduleEntry}
        moveEntryAction={moveScheduleEntry}
        saveScheduleAction={saveCalendarSchedule}
        deleteScheduleAction={deleteCalendarSchedule}
      />
    </div>
  );
}

