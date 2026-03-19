"use client";

import useSWR from "swr";
import dayjs from "dayjs";

type CalendarRangeResponse = {
  entries: unknown[];
  rankState: unknown;
  rankCycleHistory: unknown[];
  schedules: unknown[];
  events: unknown[];
};

export type { CalendarRangeResponse };

const fetcher = async (url: string): Promise<CalendarRangeResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`calendar-range fetch failed: ${res.status}`);
  }
  return res.json();
};

export function getRangeFromBaseMonth(baseMonth: string): { from: string; to: string } {
  const m = dayjs(`${baseMonth}-15`, "YYYY-MM-DD");
  const from = m.subtract(2, "month").startOf("month").startOf("week").format("YYYY-MM-DD");
  const to = m.add(2, "month").endOf("month").endOf("week").format("YYYY-MM-DD");
  return { from, to };
}

export function useCalendarRange(
  calendarId: string | null,
  baseMonth: string | null,
  includeEvents: boolean
) {
  const hasParams = !!calendarId && !!baseMonth;
  const { from, to } = baseMonth ? getRangeFromBaseMonth(baseMonth) : { from: null, to: null };
  const key =
    hasParams && from && to
      ? `/api/calendar-range?calendarId=${encodeURIComponent(calendarId!)}&from=${from}&to=${to}&includeEvents=${includeEvents ? "1" : "0"}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<CalendarRangeResponse>(key, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isError: !!error,
    mutate,
  };
}

