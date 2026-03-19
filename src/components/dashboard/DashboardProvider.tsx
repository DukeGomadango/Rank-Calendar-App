"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dayjs from "dayjs";
import { usePathname } from "next/navigation";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { useCalendarRange } from "@/lib/hooks/useCalendarRange";
import {
  addDays,
  getCycleEndDateIncludingSkips,
  toJstDateString,
} from "@/lib/domain/calendar";
import {
  judgeCycleRank,
  getNextRank,
  getPreviousRank,
  type RankLabel,
} from "@/lib/domain/rank";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import type { EventRow } from "@/lib/data/events";

type DashboardContextValue = {
  calendarId: string;
  calendarName: string;
  permissions: CalendarPermissionFlags;
  baseMonth: string;
  setBaseMonth: (month: string) => void;
  refreshRange: () => void;
  rangeData:
    | {
        entries: ScheduleEntryRow[];
        schedules: CalendarScheduleRow[];
        events: EventRow[];
        rankState:
          | {
              rank_cycle_start_date: string;
              rank_reset_date: string;
              current_rank: string | null;
              skip_pass_remaining?: number | null;
            }
          | null;
        rankCycleHistory: {
          cycle_start_date: string;
          cycle_end_date: string;
          rank_during: string | null;
          cycle_total?: number | null;
        }[];
      }
    | null;
  futureCycles: { start: string; end: string; rank: string }[];
  forecastLabel: string | null;
  isLoading: boolean;
  todayJst: string;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

type Props = {
  calendarId: string;
  calendarName: string;
  permissions: CalendarPermissionFlags;
  fromInvite?: boolean;
  children: ReactNode;
};

export function DashboardProvider({
  calendarId,
  calendarName,
  permissions,
  children,
}: Props) {
  const pathname = usePathname();
  const [baseMonth, setBaseMonth] = useState(dayjs().format("YYYY-MM"));

  // 編集頻度が高い`/dashboard/data`ではeventsを同梱しない（レスポンス肥大を回避）。
  const includeEvents = pathname.startsWith("/dashboard/calendar");

  const { data, isLoading, mutate } = useCalendarRange(
    calendarId,
    baseMonth,
    includeEvents
  );
  const todayJst = useMemo(() => toJstDateString(new Date()), []);

  const { rangeData, futureCycles, forecastLabel } = useMemo(() => {
    if (!data) {
      return {
        rangeData: null,
        futureCycles: [] as { start: string; end: string; rank: string }[],
        forecastLabel: null as string | null,
      };
    }

    const entries = (data.entries ?? []) as ScheduleEntryRow[];
    const rankState = data.rankState as
      | {
          rank_cycle_start_date: string;
          rank_reset_date: string;
          current_rank: string | null;
          skip_pass_remaining?: number | null;
        }
      | null;

    const rankCycleHistory = (data.rankCycleHistory ?? []) as {
      cycle_start_date: string;
      cycle_end_date: string;
      rank_during: string | null;
      cycle_total?: number | null;
    }[];

    const schedules = (data.schedules ?? []) as CalendarScheduleRow[];
    const events = (data.events ?? []) as EventRow[];

    const rangeData = {
      entries,
      schedules,
      events,
      rankState,
      rankCycleHistory,
    };

    if (!rankState || !permissions.canViewRank) {
      return {
        rangeData,
        futureCycles: [] as { start: string; end: string; rank: string }[],
        forecastLabel: null as string | null,
      };
    }

    const entriesByDateForForecast = new Map<string, ScheduleEntryRow>(
      entries.map((e) => [e.date, e]),
    );

    let forecastRankForNextCycle: RankLabel | null = null;
    if (rankState.current_rank != null) {
      const cycleStartForForecast = rankState.rank_cycle_start_date;
      const cycleEndForForecast = rankState.rank_reset_date;
      let projectedTotal = 0;
      let cursorForecast = cycleStartForForecast;
      while (cursorForecast <= cycleEndForForecast) {
        const entry = entriesByDateForForecast.get(cursorForecast);
        if (cursorForecast <= todayJst) {
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
        forecastRankForNextCycle = getNextRank(
          rankState.current_rank as RankLabel,
        );
      } else if (isKeep) {
        forecastRankForNextCycle = rankState.current_rank as RankLabel;
      } else {
        forecastRankForNextCycle =
          (getPreviousRank(
            rankState.current_rank as RankLabel,
          ) as RankLabel | null) ?? (rankState.current_rank as RankLabel);
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
      const toDate = dayjs(baseMonth + "-15")
        .endOf("month")
        .endOf("week")
        .format("YYYY-MM-DD");

      while (periodStart <= toDate && rankForThisPeriod != null) {
        const periodEnd = getCycleEndDateIncludingSkips(
          periodStart,
          entriesByDateForForecast,
        );
        let projectedTotal = 0;
        let c = periodStart;
        while (c <= periodEnd) {
          const entry = entriesByDateForForecast.get(c);
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
        futureCycles.push({
          start: periodStart,
          end: periodEnd,
          rank: rankForThisPeriod as string,
        });
        const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
        if (canRankUp) {
          rankForThisPeriod = getNextRank(
            rankForThisPeriod as RankLabel,
          );
        } else if (isKeep) {
          // keep
        } else {
          rankForThisPeriod =
            (getPreviousRank(
              rankForThisPeriod as RankLabel,
            ) as RankLabel | null) ?? rankForThisPeriod;
        }
        periodStart = addDays(periodEnd, 1);
      }
    }

    return { rangeData, futureCycles, forecastLabel };
  }, [data, permissions.canViewRank, baseMonth, todayJst]);

  const refreshRange = () => {
    void mutate();
  };

  const value: DashboardContextValue = {
    calendarId,
    calendarName,
    permissions,
    baseMonth,
    setBaseMonth,
    refreshRange,
    rangeData,
    futureCycles,
    forecastLabel,
    isLoading,
    todayJst,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardCalendar(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardCalendar must be used within DashboardProvider");
  }
  return ctx;
}

