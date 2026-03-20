"use client";

import { useEffect } from "react";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { EnsureCalendarIdInUrl } from "@/components/dashboard/EnsureCalendarIdInUrl";
import { CalendarWithDataProvider } from "@/components/schedule/CalendarWithDataProvider";
import type { SaveCalendarScheduleResult } from "@/app/(dashboard)/dashboard/actions";
import type { SaveScheduleEntryResult } from "@/lib/validations/schedule";

type Props = {
  initialMonth: string; // YYYY-MM
  initialWeekStart: string; // YYYY-MM-DD
  saveEntryAction: (formData: FormData) => Promise<SaveScheduleEntryResult>;
  moveEntryAction: (
    calendarId: string,
    fromDate: string,
    toDate: string,
  ) => Promise<void>;
  saveScheduleAction: (formData: FormData) => Promise<SaveCalendarScheduleResult>;
  deleteScheduleAction: (calendarId: string, scheduleId: string) => Promise<void>;
  shiftScheduleAction: (
    calendarId: string,
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => Promise<void>;
  resizeScheduleAction: (
    calendarId: string,
    scheduleId: string,
    edge: "start" | "end",
    newDate: string,
    newTime: string
  ) => Promise<void>;
  undoScheduleAction: (calendarId: string) => Promise<void>;
  redoScheduleAction: (calendarId: string) => Promise<void>;
};

export function CalendarPageClient({
  initialMonth,
  initialWeekStart,
  saveEntryAction,
  moveEntryAction,
  saveScheduleAction,
  deleteScheduleAction,
  shiftScheduleAction,
  resizeScheduleAction,
  undoScheduleAction,
  redoScheduleAction,
}: Props) {
  const { calendarId, calendarName, permissions, setBaseMonth } =
    useDashboardCalendar();

  useEffect(() => {
    // 初回表示月に合わせて Provider の baseMonth も揃える（タブ間で同じレンジキャッシュを共有するため）
    setBaseMonth(initialMonth);
  }, [initialMonth, setBaseMonth]);

  if (!permissions.canViewCalendar) {
    return (
      <div className="space-y-4">
        <EnsureCalendarIdInUrl />
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            カレンダー
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            このカレンダーを閲覧する権限がありません。オーナーに権限の付与を依頼してください。
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EnsureCalendarIdInUrl />
      <CalendarWithDataProvider
        calendarId={calendarId}
        calendarName={calendarName ?? "メインカレンダー"}
        initialMonth={initialMonth}
        initialWeekStart={initialWeekStart}
        permissions={permissions}
        saveEntryAction={saveEntryAction}
        moveEntryAction={moveEntryAction}
        saveScheduleAction={saveScheduleAction}
        deleteScheduleAction={deleteScheduleAction}
        shiftScheduleAction={shiftScheduleAction}
        resizeScheduleAction={resizeScheduleAction}
        undoScheduleAction={undoScheduleAction}
        redoScheduleAction={redoScheduleAction}
      />
    </div>
  );
}

