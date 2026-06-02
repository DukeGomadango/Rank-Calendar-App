"use client";

import useSWR from "swr";
import dayjs from "dayjs";

type CalendarRangeResponse = {
  entries: unknown[];
  rankState: unknown;
  rankCycleHistory: unknown[];
  schedules: unknown[];
  events: unknown[];
  skipPassSnapshots?: unknown[];
};

export type { CalendarRangeResponse };
export type CalendarRangeMode = "home" | "calendar" | "data";

const fetcher = async (url: string): Promise<CalendarRangeResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`calendar-range fetch failed: ${res.status}`);
  }
  return res.json();
};

function buildRangeKey(
  calendarId: string,
  from: string,
  to: string,
  mode: CalendarRangeMode,
  includeEvents: boolean,
  includeSchedules: boolean,
): string {
  return (
    `/api/calendar-range?calendarId=${encodeURIComponent(calendarId)}&from=${from}&to=${to}&mode=${mode}`
    + `&includeEvents=${includeEvents ? "1" : "0"}`
    + `&includeSchedules=${includeSchedules ? "1" : "0"}`
  );
}

export function getRangeFromBaseMonth(baseMonth: string): { from: string; to: string } {
  const m = dayjs(`${baseMonth}-15`, "YYYY-MM-DD");
  const from = m.subtract(2, "month").startOf("month").startOf("week").format("YYYY-MM-DD");
  const to = m.add(2, "month").endOf("month").endOf("week").format("YYYY-MM-DD");
  return { from, to };
}

/**
 * 表示月周辺の取得範囲。ランク周期の起点より前に from が来ないよう、必要なら過去へ広げる。
 */
export function getCalendarRangeBounds(
  baseMonth: string,
  rankCycleStartDate?: string | null,
): { from: string; to: string } {
  const base = getRangeFromBaseMonth(baseMonth);
  if (!rankCycleStartDate || rankCycleStartDate >= base.from) {
    return base;
  }
  return { from: rankCycleStartDate, to: base.to };
}

export function useCalendarRange(
  calendarId: string | null,
  baseMonth: string | null,
  mode: CalendarRangeMode,
  includeEvents: boolean,
  includeSchedules: boolean,
) {
  const hasParams = !!calendarId && !!baseMonth;
  const baseBounds = baseMonth ? getRangeFromBaseMonth(baseMonth) : null;

  const primaryKey =
    hasParams && baseBounds
      ? buildRangeKey(
          calendarId!,
          baseBounds.from,
          baseBounds.to,
          mode,
          includeEvents,
          includeSchedules,
        )
      : null;

  const {
    data: primaryData,
    error: primaryError,
    isLoading: primaryLoading,
    mutate,
  } = useSWR<CalendarRangeResponse>(primaryKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 30_000,
    revalidateIfStale: false,
  });

  const rankCycleStartDate = (
    primaryData?.rankState as { rank_cycle_start_date?: string } | null | undefined
  )?.rank_cycle_start_date;

  const expandedBounds =
    hasParams && baseMonth && rankCycleStartDate
      ? getCalendarRangeBounds(baseMonth, rankCycleStartDate)
      : null;

  const needsExpandedFetch =
    expandedBounds != null &&
    baseBounds != null &&
    expandedBounds.from < baseBounds.from;

  const expandedKey =
    needsExpandedFetch && expandedBounds
      ? buildRangeKey(
          calendarId!,
          expandedBounds.from,
          expandedBounds.to,
          mode,
          includeEvents,
          includeSchedules,
        )
      : null;

  const {
    data: expandedData,
    error: expandedError,
    isLoading: expandedLoading,
  } = useSWR<CalendarRangeResponse>(expandedKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 30_000,
    revalidateIfStale: false,
  });

  const data = expandedData ?? primaryData;
  const isLoading = primaryLoading || (needsExpandedFetch && expandedLoading && !expandedData);

  return {
    data,
    isLoading,
    isError: !!(primaryError || expandedError),
    mutate,
  };
}
