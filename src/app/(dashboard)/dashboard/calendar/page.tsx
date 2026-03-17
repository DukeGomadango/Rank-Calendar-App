/// <reference path="../../../../types/holiday-jp.d.ts" />
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCalendarForUser } from "@/lib/data/calendars";
import {
  getScheduleEntriesInRange,
  type ScheduleEntryRow,
} from "@/lib/data/schedule-entries";
import {
  getOrCreateCalendarRankState,
  getRankCycleHistory,
  ensureSkipPassIncrementForLastWeek,
} from "@/lib/data/calendar-rank-state";
import { listEventsForCalendar } from "@/lib/data/events";
import {
  getSchedulesInRange,
  type CalendarScheduleRow,
} from "@/lib/data/schedules";
import { judgeCycleRank, getNextRank, getPreviousRank, RANK_ORDER, type RankLabel } from "@/lib/domain/rank";
import { addDays, getCycleEndDateIncludingSkips, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";
import { getMockEvents } from "@/lib/mock-seed-data";
import {
  getCalendarPermissionsForUser,
  getMockPermissions,
  type CalendarPermissionFlags,
} from "@/lib/auth/permission";
import {
  saveScheduleEntry,
  moveScheduleEntry,
  noopMoveEntry,
  noopSaveEntry,
  saveCalendarSchedule,
  deleteCalendarSchedule,
} from "../actions";
import { CalendarMockWrapper } from "@/components/schedule/CalendarMockWrapper";
import { CalendarWithModal } from "@/components/schedule/CalendarWithModal";

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

/** forecastLabel（例: 目標達成で → A2）から予測ランクを抽出。RANK_ORDER に含まれる場合のみ返す。 */
function parseForecastRank(forecastLabel: string | null): string | null {
  if (!forecastLabel?.includes("→")) return null;
  const after = forecastLabel.split("→")[1]?.trim().split(/\s/)[0] ?? null;
  if (!after || !RANK_ORDER.includes(after as (typeof RANK_ORDER)[number])) return null;
  return after;
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

  const events = await listEventsForCalendar(currentCalendar.id);

  const todayJst = toJstDateString(new Date());
  const today = dayjs(todayJst);
  const monthStart = displayMonth.startOf("month");
  const monthEnd = displayMonth.endOf("month");

  const fromDate = monthStart.startOf("week").format("YYYY-MM-DD");
  const toDate = monthEnd.endOf("week").format("YYYY-MM-DD");

  const [entries, rankState, rankCycleHistory, schedules] = await Promise.all([
    getScheduleEntriesInRange(currentCalendar.id, fromDate, toDate),
    getOrCreateCalendarRankState(currentCalendar.id),
    getRankCycleHistory(currentCalendar.id, fromDate, toDate),
    getSchedulesInRange(currentCalendar.id, fromDate, toDate),
  ]);

  await ensureSkipPassIncrementForLastWeek(currentCalendar.id);
  const rankStateLatest = await getOrCreateCalendarRankState(currentCalendar.id);
  let forecastLabel: string | null = null;
  if (permissions.canViewRank && rankState.current_rank != null) {
    const cycleStart = rankState.rank_cycle_start_date;
    const cycleEnd = rankState.rank_reset_date;
    const cycleEntries = await getScheduleEntriesInRange(
      currentCalendar.id,
      cycleStart,
      cycleEnd
    );
    const entriesByDateCycle = new Map(
      cycleEntries.map((e) => [e.date, e])
    );
    let projectedTotal = 0;
    let cursor = cycleStart;
    while (cursor <= cycleEnd) {
      const entry = entriesByDateCycle.get(cursor);
      if (cursor <= todayJst) {
        const plus =
          entry?.skip_pass_used || entry?.actual_plus == null
            ? 0
            : Math.max(0, entry.actual_plus);
        if (!entry?.skip_pass_used) projectedTotal += plus;
      } else {
        const target = entry?.target_plus ?? 0;
        projectedTotal += Math.max(0, target);
      }
      cursor = addDays(cursor, 1);
    }
    const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
    if (canRankUp) {
      const next = getNextRank(rankState.current_rank);
      forecastLabel = next ? `目標達成で → ${next}` : "目標達成で 最大ランク";
    } else if (isKeep) {
      forecastLabel = "目標達成で キープ見込み";
    } else {
      forecastLabel = "目標達成で 注意（ダウン見込み）";
    }
  }

  /** 予測の次の周期に表示するランク（ランクアップ＝次のランク、キープ＝現ランク、ダウン＝1つ下、最大ランク＝現ランクで維持）。forecastLabel の内容から逆算。 */
  const forecastNextRank =
    permissions.canViewRank && rankState.current_rank != null && forecastLabel != null
      ? ((): string | null => {
          const parsed = parseForecastRank(forecastLabel);
          if (parsed) return parsed;
          if (forecastLabel.includes("最大ランク") || forecastLabel.includes("キープ見込み")) return rankState.current_rank;
          if (forecastLabel.includes("ダウン見込み")) return getPreviousRank(rankState.current_rank) ?? rankState.current_rank;
          return null;
        })()
      : null;

  const entriesByDate = new Map<string, ScheduleEntryRow[]>();
  for (const entry of entries) {
    const list = entriesByDate.get(entry.date) ?? [];
    list.push(entry);
    entriesByDate.set(entry.date, list);
  }

  const rankCycleHistoryWithTotal =
    permissions.canViewRank
      ? rankCycleHistory.map((h) => {
          let cycleTotal = 0;
          for (const e of entries) {
            if (
              e.date >= h.cycle_start_date &&
              e.date <= h.cycle_end_date &&
              !e.skip_pass_used &&
              e.actual_plus != null
            ) {
              cycleTotal += e.actual_plus;
            }
          }
          return {
            cycle_start_date: h.cycle_start_date,
            cycle_end_date: h.cycle_end_date,
            rank_during: h.rank_during,
            cycle_total: cycleTotal,
          };
        })
      : [];

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
    const isCurrentMonth = cursor.isSame(displayMonth, "month");
    const jpHoliday = (await import("holiday-jp")).isHoliday(cursor.toDate());
    const custom = getCustomDayLabel(cursor);
    const holidayName =
      jpHoliday?.name === "元日" && custom
        ? `${jpHoliday.name} / ${custom}`
        : jpHoliday?.name ?? custom;

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

  /** 表示範囲内の未来周期を、周期ごとの見込みで連鎖計算して組み立てる。 */
  type FutureCycle = { start: string; end: string; rank: string };
  const futureCycles: FutureCycle[] = [];
  if (permissions.canViewRank && forecastNextRank != null) {
    const entriesByDate = new Map(entries.map((e) => [e.date, e]));
    let periodStart = addDays(rankState.rank_reset_date, 1);
    let rankForThisPeriod: string | null = forecastNextRank;
    while (periodStart <= toDate && rankForThisPeriod != null) {
      const periodEnd = getCycleEndDateIncludingSkips(periodStart, entriesByDate);
      let projectedTotal = 0;
      let c = periodStart;
      while (c <= periodEnd) {
        const entry = entriesByDate.get(c);
        if (c <= todayJst) {
          const plus =
            entry?.skip_pass_used || entry?.actual_plus == null
              ? 0
              : Math.max(0, entry.actual_plus);
          if (!entry?.skip_pass_used) projectedTotal += plus;
        } else {
          const target = entry?.target_plus ?? 0;
          projectedTotal += Math.max(0, target);
        }
        c = addDays(c, 1);
      }
      futureCycles.push({ start: periodStart, end: periodEnd, rank: rankForThisPeriod });
      const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
      if (canRankUp) {
        const next = getNextRank(rankForThisPeriod as RankLabel);
        rankForThisPeriod = next ?? rankForThisPeriod; // S3 のとき null → 維持
      } else if (isKeep) {
        rankForThisPeriod = rankForThisPeriod;
      } else {
        rankForThisPeriod = getPreviousRank(rankForThisPeriod as RankLabel) ?? rankForThisPeriod;
      }
      periodStart = addDays(periodEnd, 1);
    }
  }

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
        calendarName={currentCalendar.name ?? "メインカレンダー"}
        monthLabel={currentMonthLabel}
        currentMonthParam={currentMonthParam}
        currentWeekStart={currentWeekStart}
        calendarId={currentCalendar.id}
        permissions={permissions}
        days={days}
        moveEntry={moveScheduleEntry}
        saveAction={saveScheduleEntry}
        saveScheduleAction={saveCalendarSchedule}
        deleteScheduleAction={deleteCalendarSchedule}
        events={events}
        currentRankCycle={
          permissions.canViewRank
            ? {
                start: rankState.rank_cycle_start_date,
                end: rankState.rank_reset_date,
                rank: rankState.current_rank,
              }
            : null
        }
        rankCycleHistory={rankCycleHistoryWithTotal}
        forecastLabel={forecastLabel}
        futureCycles={futureCycles}
        todayJst={todayJst}
        skipPassRemaining={rankStateLatest.skip_pass_remaining ?? 0}
        schedules={schedules}
      />
    </div>
  );
}

