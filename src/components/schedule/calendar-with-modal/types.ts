import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import type { PeriodType } from "./calendar-display-helpers";

export type DayData = {
  date: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  weekday: number;
  holidayName: string | null;
  entries: ScheduleEntryRow[];
};

export type RankCycleBand = {
  cycle_start_date: string;
  cycle_end_date: string;
  rank_during: string | null;
  cycle_total?: number | null;
};

export type CycleInfoForDate = {
  start: string;
  end: string;
  rank: string | null;
  isCurrent: boolean;
  cycleTotal?: number | null;
  periodType: PeriodType;
  isPredicted?: boolean;
} | null;

export type CalendarWithModalProps = {
  calendarName: string;
  monthLabel: string;
  currentMonthParam: string;
  currentWeekStart: string;
  calendarId: string;
  days: DayData[];
  permissions: CalendarPermissionFlags;
  onChangeMonth?: (month: string) => void;
  onChangeWeek?: (month: string, weekStart: string) => void;
  moveEntry: (calendarId: string, fromDate: string, toDate: string) => Promise<void>;
  saveAction: (formData: FormData) => void;
  events: EventRow[];
  currentRankCycle?: { start: string; end: string; rank: string | null } | null;
  rankCycleHistory?: RankCycleBand[];
  forecastLabel?: string | null;
  futureCycles?: { start: string; end: string; rank: string }[];
  todayJst?: string | null;
  skipPassRemaining?: number;
  schedules?: CalendarScheduleRow[];
  saveScheduleAction?: (formData: FormData) => Promise<
    | { ok: true }
    | { ok: false; errors: Record<string, string[]> }
    | void
  >;
  deleteScheduleAction?: (scheduleId: string) => Promise<void>;
  shiftScheduleAction?: (
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => Promise<void>;
  resizeScheduleAction?: (
    scheduleId: string,
    edge: "start" | "end",
    newDate: string,
    newTime: string
  ) => Promise<void>;
  undoScheduleAction?: () => Promise<void>;
  redoScheduleAction?: () => Promise<void>;
};
