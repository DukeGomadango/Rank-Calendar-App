"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import dayjs from "dayjs";
import { usePathname } from "next/navigation";
import { mutate as globalMutate, type KeyedMutator } from "swr";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import {
  useCalendarRange,
  type CalendarRangeMode,
  type CalendarRangeResponse,
} from "@/lib/hooks/useCalendarRange";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { SimulatedRankCycle } from "@/lib/domain/rank-simulation";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import type { EventRow } from "@/lib/data/events";
import { useDashboardRangeDerived } from "./useDashboardRangeDerived";

type DashboardContextValue = {
  calendarId: string;
  calendarName: string;
  permissions: CalendarPermissionFlags;
  fromInvite: boolean;
  baseMonth: string;
  setBaseMonth: (month: string) => void;
  refreshRange: (options?: { modes?: CalendarRangeMode[] }) => void;
  mutateRange: KeyedMutator<CalendarRangeResponse>;
  rangeData:
    | {
        entries: ScheduleEntryRow[];
        schedules: CalendarScheduleRow[];
        events: EventRow[];
        skipPassSnapshots?: { as_of_date: string; remaining: number }[];
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
  displayRankCycles: SimulatedRankCycle[];
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
  fromInvite = false,
  children,
}: Props) {
  const pathname = usePathname();
  const [baseMonth, setBaseMonth] = useState(dayjs().format("YYYY-MM"));

  const needsRangeData =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/calendar") ||
    pathname.startsWith("/dashboard/data");

  // 編集頻度が高い`/dashboard/data`ではeventsを同梱しない（レスポンス肥大を回避）。
  const includeEvents =
    needsRangeData &&
    (pathname.startsWith("/dashboard/calendar") || pathname === "/dashboard");
  const includeSchedules = needsRangeData && pathname.startsWith("/dashboard/calendar");
  const rangeMode: CalendarRangeMode = pathname.startsWith("/dashboard/calendar")
    ? "calendar"
    : pathname.startsWith("/dashboard/data")
      ? "data"
      : "home";

  const { data, isLoading, mutate } = useCalendarRange(
    needsRangeData ? calendarId : null,
    needsRangeData ? baseMonth : null,
    rangeMode,
    includeEvents,
    includeSchedules,
  );
  const { rangeData, futureCycles, displayRankCycles, forecastLabel, todayJst } =
    useDashboardRangeDerived(data, permissions.canViewRank, baseMonth);

  const refreshRange = (options?: { modes?: CalendarRangeMode[] }) => {
    const modes = options?.modes;
    if (!modes || modes.length === 0) {
      void mutate();
      return;
    }

    const encodedCalendarId = encodeURIComponent(calendarId);
    const modeSet = new Set<CalendarRangeMode>(modes);
    void globalMutate((key) => {
      if (typeof key !== "string") return false;
      if (!key.startsWith("/api/calendar-range?")) return false;
      if (!key.includes(`calendarId=${encodedCalendarId}`)) return false;
      const matched = key.match(/[?&]mode=([^&]+)/);
      if (!matched?.[1]) return false;
      const mode = decodeURIComponent(matched[1]) as CalendarRangeMode;
      return modeSet.has(mode);
    });

    // 現在画面のキーはローカルmutateでも即時再検証しておく。
    if (modeSet.has(rangeMode)) {
      void mutate();
    }
  };

  const value: DashboardContextValue = {
    calendarId,
    calendarName,
    permissions,
    fromInvite,
    baseMonth,
    setBaseMonth,
    refreshRange,
    mutateRange: mutate,
    rangeData,
    futureCycles,
    displayRankCycles,
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

