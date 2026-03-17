"use client";

import { useState, useMemo } from "react";
import dayjs from "dayjs";

import { useCalendarRange } from "@/lib/hooks/useCalendarRange";
import { toJstDateString, addDays } from "@/lib/domain/calendar";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { CalendarWithModal } from "./CalendarWithModal";

type DayData = {
  date: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  weekday: number;
  holidayName: string | null;
  entries: ScheduleEntryRow[];
};

type Props = {
  calendarId: string;
  calendarName: string;
  initialMonth: string; // YYYY-MM
  initialWeekStart: string; // YYYY-MM-DD
  permissions: CalendarPermissionFlags;
};

export function CalendarWithDataProvider({
  calendarId,
  calendarName,
  initialMonth,
  initialWeekStart,
  permissions,
}: Props) {
  const [view, setView] = useState<"month" | "week">("month");
  const [displayMonth, setDisplayMonth] = useState(dayjs(`${initialMonth}-15`, "YYYY-MM-DD"));
  const [displayWeekStart, setDisplayWeekStart] = useState(initialWeekStart);

  const baseMonth = displayMonth.format("YYYY-MM");
  const { data, isLoading } = useCalendarRange(calendarId, baseMonth);

  const todayJst = useMemo(() => toJstDateString(new Date()), []);
  const today = dayjs(todayJst);

  const { days } = useMemo(() => {
    if (!data) {
      return { days: [] as DayData[] };
    }
    const entries = data.entries as ScheduleEntryRow[];
    const events = data.events as EventRow[];
    const schedules = data.schedules as CalendarScheduleRow[];

    // from/to はフック内部で決まっているが、days 用には現在の表示月に近い範囲だけ組み立てれば良い。
    const monthStart = displayMonth.startOf("month");
    const monthEnd = displayMonth.endOf("month");
    const fromDate = monthStart.startOf("week").format("YYYY-MM-DD");
    const toDate = monthEnd.endOf("week").format("YYYY-MM-DD");

    const days: DayData[] = [];
    let cursor = dayjs(fromDate);
    const end = dayjs(toDate);
    while (cursor.isSame(end) || cursor.isBefore(end)) {
      const dateStr = cursor.format("YYYY-MM-DD");
      const weekday = cursor.day();
      const inMonth = cursor.isSame(displayMonth, "month");
      const isToday = cursor.isSame(today, "day");
      const dayEntries = (entries ?? []).filter((e) => e.date === dateStr);
      // 祝日情報は旧 page.tsx のロジックをそのまま持ってくるのは重いので、ここでは null としておき、
      // 既存の getCustomDayLabel/holiday-jp 連携を徐々に移行する。
      const holidayName: string | null = null;

      days.push({
        date: dateStr,
        isToday,
        isCurrentMonth: inMonth,
        weekday,
        holidayName,
        entries: dayEntries,
      });

      cursor = cursor.add(1, "day");
    }

    return { days };
  }, [data, displayMonth, today]);

  const events = (data?.events ?? []) as EventRow[];
  const schedules = (data?.schedules ?? []) as CalendarScheduleRow[];
  const rankState = data?.rankState as
    | {
        rank_cycle_start_date: string;
        rank_reset_date: string;
        current_rank: string | null;
        skip_pass_remaining?: number | null;
      }
    | undefined;
  const rankCycleHistory = (data?.rankCycleHistory ?? []) as {
    cycle_start_date: string;
    cycle_end_date: string;
    rank_during: string | null;
    cycle_total?: number | null;
  }[];

  const currentRankCycle =
    rankState && permissions.canViewRank
      ? {
          start: rankState.rank_cycle_start_date,
          end: rankState.rank_reset_date,
          rank: rankState.current_rank,
        }
      : null;

  const rankStateLatest = rankState;

  return (
    <>
      {isLoading && (
        <div className="fixed right-4 top-20 z-50 rounded-md bg-zinc-900/80 px-3 py-1 text-[11px] text-white shadow">
          更新中…
        </div>
      )}
      <CalendarWithModal
        calendarName={calendarName}
        monthLabel={displayMonth.format("YYYY年 M月")}
        currentMonthParam={baseMonth}
        currentWeekStart={displayWeekStart}
        calendarId={calendarId}
        days={days}
        permissions={permissions}
        onChangeMonth={(month) => {
          setView("month");
          setDisplayMonth(dayjs(`${month}-15`, "YYYY-MM-DD"));
        }}
        onChangeWeek={(_, weekStart) => {
          setView("week");
          setDisplayWeekStart(weekStart);
          setDisplayMonth(dayjs(weekStart, "YYYY-MM-DD").startOf("month"));
        }}
        moveEntry={async () => {}}
        saveAction={() => {}}
        events={events}
        currentRankCycle={currentRankCycle}
        rankCycleHistory={rankCycleHistory}
        forecastLabel={null}
        futureCycles={[]}
        todayJst={todayJst}
        skipPassRemaining={rankStateLatest?.skip_pass_remaining ?? 0}
        schedules={schedules}
        saveScheduleAction={undefined}
        deleteScheduleAction={undefined}
      />
    </>
  );
}

