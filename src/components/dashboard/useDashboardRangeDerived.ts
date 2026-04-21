"use client";

import { useMemo } from "react";
import dayjs from "dayjs";

import type { CalendarRangeResponse } from "@/lib/hooks/useCalendarRange";
import {
  addDays,
  getCycleEndDateIncludingSkips,
  toJstDateString,
} from "@/lib/domain/calendar";
import {
  judgeCycleRank,
  getNextRank,
  getPreviousRank,
  projectedPlusForRankForecast,
  type RankLabel,
} from "@/lib/domain/rank";
import { getUsablePredictedSkipPassDates } from "@/lib/domain/skip-pass-prediction";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import type { EventRow } from "@/lib/data/events";

type RangeSlice = {
  entries: ScheduleEntryRow[];
  schedules: CalendarScheduleRow[];
  events: EventRow[];
  skipPassSnapshots: { as_of_date: string; remaining: number }[];
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
};

export type DashboardRangeDerived = {
  rangeData: RangeSlice | null;
  futureCycles: { start: string; end: string; rank: string }[];
  forecastLabel: string | null;
  todayJst: string;
};

/**
 * SWR の calendar-range レスポンスから、ランク予測・将来周期・表示用 rangeData を派生させる。
 */
export function useDashboardRangeDerived(
  data: CalendarRangeResponse | undefined,
  canViewRank: boolean,
  baseMonth: string
): DashboardRangeDerived {
  const todayJst = useMemo(() => toJstDateString(new Date()), []);

  const slice = useMemo(() => {
    if (!data) {
      return {
        rangeData: null,
        futureCycles: [] as { start: string; end: string; rank: string }[],
        forecastLabel: null as string | null,
        todayJst,
      };
    }

    const entries = (data.entries ?? []) as ScheduleEntryRow[];
    const rankState = data.rankState as RangeSlice["rankState"];

    const rankCycleHistory = (data.rankCycleHistory ?? []) as RangeSlice["rankCycleHistory"];

    const schedules = (data.schedules ?? []) as CalendarScheduleRow[];
    const events = (data.events ?? []) as EventRow[];
    const skipPassSnapshots = (data.skipPassSnapshots ?? []) as RangeSlice["skipPassSnapshots"];

    const rangeData: RangeSlice = {
      entries,
      schedules,
      events,
      skipPassSnapshots,
      rankState,
      rankCycleHistory,
    };

    if (!rankState || !canViewRank) {
      return {
        rangeData,
        futureCycles: [] as { start: string; end: string; rank: string }[],
        forecastLabel: null as string | null,
        todayJst,
      };
    }

    const entriesByDateForForecast = new Map<string, ScheduleEntryRow>(
      entries.map((e) => [e.date, e]),
    );
    const forecastToDate = dayjs(baseMonth + "-15")
      .endOf("month")
      .endOf("week")
      .format("YYYY-MM-DD");
    const skipPredictionEnd = addDays(rankState.rank_reset_date, 90);
    const usableFutureSkipDates = getUsablePredictedSkipPassDates(
      rankState.skip_pass_remaining ?? 0,
      todayJst,
      skipPredictionEnd,
      entriesByDateForForecast,
      todayJst,
    );
    const getEntryForForecast = (date: string): ScheduleEntryRow | undefined => {
      const entry = entriesByDateForForecast.get(date);
      if (!entry) return undefined;
      if (date >= todayJst && entry.skip_pass_used && !usableFutureSkipDates.has(date)) {
        return { ...entry, skip_pass_used: false };
      }
      return entry;
    };

    let forecastRankForNextCycle: RankLabel | null = null;
    if (rankState.current_rank != null) {
      const cycleStartForForecast = rankState.rank_cycle_start_date;
      const cycleEndForForecast = rankState.rank_reset_date;
      let projectedTotal = 0;
      let cursorForecast = cycleStartForForecast;
      while (cursorForecast <= cycleEndForForecast) {
        const entry = getEntryForForecast(cursorForecast);
        projectedTotal += projectedPlusForRankForecast(
          entry,
          cursorForecast,
          todayJst,
        );
        cursorForecast = addDays(cursorForecast, 1);
      }
      const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
      if (canRankUp) {
        forecastRankForNextCycle =
          getNextRank(rankState.current_rank as RankLabel) ??
          (rankState.current_rank as RankLabel);
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
      const toDate = forecastToDate;

      while (periodStart <= toDate && rankForThisPeriod != null) {
        const periodEnd = getCycleEndDateIncludingSkips(
          periodStart,
          entriesByDateForForecast,
        );
        let projectedTotal = 0;
        let c = periodStart;
        while (c <= periodEnd) {
          const entry = getEntryForForecast(c);
          projectedTotal += projectedPlusForRankForecast(entry, c, todayJst);
          c = addDays(c, 1);
        }
        futureCycles.push({
          start: periodStart,
          end: periodEnd,
          rank: rankForThisPeriod as string,
        });
        const { canRankUp, isKeep } = judgeCycleRank(projectedTotal);
        if (canRankUp) {
          rankForThisPeriod =
            getNextRank(rankForThisPeriod as RankLabel) ??
            (rankForThisPeriod as RankLabel);
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

    return { rangeData, futureCycles, forecastLabel, todayJst };
  }, [data, canViewRank, baseMonth, todayJst]);

  return slice;
}
