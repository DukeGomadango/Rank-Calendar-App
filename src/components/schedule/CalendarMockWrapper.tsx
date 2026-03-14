"use client";

import { useMemo } from "react";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { useMockSchedule } from "@/lib/mock-schedule-context";
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
  calendarName: string;
  monthLabel: string;
  currentMonthParam: string;
  currentWeekStart: string;
  calendarId: string;
  days: DayData[];
  permissions: CalendarPermissionFlags;
  moveEntry: (calendarId: string, fromDate: string, toDate: string) => Promise<void>;
  saveAction: (formData: FormData) => void;
  events: { id: string; name: string }[];
  currentRankCycle?: { start: string; end: string; rank: string | null } | null;
  rankCycleHistory?: { cycle_start_date: string; cycle_end_date: string; rank_during: string | null; cycle_total?: number | null }[];
  forecastLabel?: string | null;
  nextCycle?: { start: string; end: string; rank: string | null } | null;
  todayJst?: string | null;
};

function mockEntryToRow(partial: Record<string, unknown>, date: string): ScheduleEntryRow {
  return {
    id: "mock",
    date,
    border_plus2: (partial.border_plus2 as number | null) ?? null,
    border_plus4: (partial.border_plus4 as number | null) ?? null,
    border_plus6: (partial.border_plus6 as number | null) ?? null,
    event_id: null,
    memo: null,
    target_plus: (partial.target_plus as number | null) ?? null,
    actual_plus: (partial.actual_plus as number | null) ?? null,
    skip_pass_used: (partial.skip_pass_used as boolean) ?? false,
  };
}

/**
 * 開発用モックで、MockScheduleContext のデータをカレンダーの days にマージして表示する。
 */
export function CalendarMockWrapper(props: Props) {
  const ctx = useMockSchedule();
  const mergedDays = useMemo(() => {
    if (!ctx) return props.days;
    return props.days.map((d) => {
      const entry = ctx.entriesByDate[d.date];
      const entries = entry
        ? [mockEntryToRow(entry, d.date)]
        : d.entries;
      return { ...d, entries };
    });
  }, [props.days, ctx?.entriesByDate]);

  return <CalendarWithModal {...props} days={mergedDays} />;
}
