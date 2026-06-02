"use client";

import { useMemo } from "react";
import dayjs from "dayjs";

import type { CalendarRangeResponse } from "@/lib/hooks/useCalendarRange";
import { toJstDateString } from "@/lib/domain/calendar";
import {
  buildDisplayRankCycles,
  type SimulatedRankCycle,
} from "@/lib/domain/rank-simulation";
import type { EntryForRankForecast } from "@/lib/domain/rank";
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
  /** 履歴 + シミュレーション済みの表示用ランク周期 */
  displayRankCycles: SimulatedRankCycle[];
  /** @deprecated displayRankCycles の isPredicted な周期。互換用 */
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
  baseMonth: string,
): DashboardRangeDerived {
  const todayJst = useMemo(() => toJstDateString(new Date()), []);

  const slice = useMemo(() => {
    if (!data) {
      return {
        rangeData: null,
        displayRankCycles: [] as SimulatedRankCycle[],
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
        displayRankCycles: [] as SimulatedRankCycle[],
        futureCycles: [] as { start: string; end: string; rank: string }[],
        forecastLabel: null as string | null,
        todayJst,
      };
    }

    const forecastToDate = dayjs(baseMonth + "-15")
      .endOf("month")
      .endOf("week")
      .format("YYYY-MM-DD");

    const entriesByDate = new Map<string, EntryForRankForecast>(
      entries.map((e) => [e.date, e]),
    );

    const { displayCycles, forecastLabel } = buildDisplayRankCycles({
      history: rankCycleHistory,
      rankState,
      entriesByDate,
      todayJst,
      simulateToDate: forecastToDate,
    });

    const futureCycles = displayCycles
      .filter((c) => c.isPredicted)
      .map((c) => ({ start: c.start, end: c.end, rank: c.rank as string }));

    return {
      rangeData,
      displayRankCycles: displayCycles,
      futureCycles,
      forecastLabel,
      todayJst,
    };
  }, [data, canViewRank, baseMonth, todayJst]);

  return slice;
}
