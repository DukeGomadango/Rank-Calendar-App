"use client";

import { useState, useMemo } from "react";
import dayjs from "dayjs";

import { useCalendarRange } from "@/lib/hooks/useCalendarRange";
import { toJstDateString, addDays, getCycleEndDateIncludingSkips } from "@/lib/domain/calendar";
import { judgeCycleRank, getNextRank, getPreviousRank, type RankLabel } from "@/lib/domain/rank";
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

  const { currentRankCycle, futureCycles, forecastLabel, rankStateLatest } = useMemo(() => {
    if (!rankState || !permissions.canViewRank) {
      return {
        currentRankCycle: null as { start: string; end: string; rank: string | null } | null,
        futureCycles: [] as { start: string; end: string; rank: string }[],
        forecastLabel: null as string | null,
        rankStateLatest: rankState,
      };
    }

    const currentRankCycle = {
      start: rankState.rank_cycle_start_date,
      end: rankState.rank_reset_date,
      rank: rankState.current_rank as string | null,
    };

    const entries = (data?.entries ?? []) as ScheduleEntryRow[];
    const toDate = displayMonth.endOf("month").endOf("week").format("YYYY-MM-DD");
    const todayStr = todayJst;

    const entriesByDateForForecast = new Map<string, ScheduleEntryRow>(
      entries.map((e) => [e.date, e])
    );

    let forecastRankForNextCycle: RankLabel | null = null;
    if (rankState.current_rank != null) {
      const cycleStartForForecast = rankState.rank_cycle_start_date;
      const cycleEndForForecast = rankState.rank_reset_date;
      let projectedTotal = 0;
      let cursorForecast = cycleStartForForecast;
      while (cursorForecast <= cycleEndForForecast) {
        const entry = entriesByDateForForecast.get(cursorForecast);
        if (cursorForecast <= todayStr) {
          const plus =
            entry?.skip_pass_used || entry?.actual_plus == null
              ? 0
              : Math.max(0, entry.actual_plus);
          if (!entry?.skip_pass_used) projectedTotal += plus;
        } else {
          const target = entry?.target_plus ?? 0;
          projectedTotal += Math.max(0, target);
        }
        cursorForecast = addDays(cursorForecast, 1);
      }
      const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
      if (canRankUp) {
        forecastRankForNextCycle = getNextRank(rankState.current_rank as RankLabel);
      } else if (isKeep) {
        forecastRankForNextCycle = rankState.current_rank as RankLabel;
      } else {
        forecastRankForNextCycle =
          (getPreviousRank(rankState.current_rank as RankLabel) as RankLabel | null) ??
          (rankState.current_rank as RankLabel);
      }
    }

    const forecastLabel =
      forecastRankForNextCycle && rankState.current_rank
        ? `${rankState.current_rank} → ${forecastRankForNextCycle}`
        : null;

    const futureCycles: { start: string; end: string; rank: string }[] = [];
    if (forecastRankForNextCycle != null) {
      let periodStart = addDays(rankState.rank_reset_date, 1);
      let rankForThisPeriod: RankLabel | null = forecastRankForNextCycle;

      while (periodStart <= toDate && rankForThisPeriod != null) {
        const periodEnd = getCycleEndDateIncludingSkips(periodStart, entriesByDateForForecast);
        let projectedTotal = 0;
        let c = periodStart;
        while (c <= periodEnd) {
          const entry = entriesByDateForForecast.get(c);
          if (c <= todayStr) {
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
        futureCycles.push({
          start: periodStart,
          end: periodEnd,
          rank: rankForThisPeriod as string,
        });
        const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
        if (canRankUp) {
          rankForThisPeriod = getNextRank(rankForThisPeriod as RankLabel);
        } else if (isKeep) {
          // そのまま
        } else {
          rankForThisPeriod =
            (getPreviousRank(rankForThisPeriod as RankLabel) as RankLabel | null) ??
            rankForThisPeriod;
        }
        periodStart = addDays(periodEnd, 1);
      }
    }

    return {
      currentRankCycle,
      futureCycles,
      forecastLabel,
      rankStateLatest: rankState,
    };
  }, [rankState, permissions.canViewRank, data?.entries, displayMonth, todayJst]);

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
        forecastLabel={forecastLabel}
        futureCycles={futureCycles}
        todayJst={todayJst}
        skipPassRemaining={rankStateLatest?.skip_pass_remaining ?? 0}
        schedules={schedules}
        saveScheduleAction={undefined}
        deleteScheduleAction={undefined}
      />
    </>
  );
}

