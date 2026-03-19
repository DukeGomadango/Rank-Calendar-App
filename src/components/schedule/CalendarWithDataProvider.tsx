"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import type { SaveScheduleEntryResult } from "@/lib/validations/schedule";
import type { SaveCalendarScheduleResult } from "@/app/(dashboard)/dashboard/actions";
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
  /** 日別ランクスケジュール保存用 Server Action（カレンダーモーダルから呼び出す） */
  saveEntryAction?: (formData: FormData) => Promise<SaveScheduleEntryResult>;
  /** 日別ランクスケジュール移動用 Server Action（ドラッグ&ドロップ用） */
  moveEntryAction?: (calendarId: string, fromDate: string, toDate: string) => Promise<void>;
  /** 時間付き予定保存用 Server Action */
  saveScheduleAction?: (formData: FormData) => Promise<SaveCalendarScheduleResult>;
  /** 時間付き予定削除用 Server Action */
  deleteScheduleAction?: (scheduleId: string) => Promise<void>;
  /** 予定（calendar_schedules）移動/コピー用 Server Action */
  shiftScheduleAction?: (
    calendarId: string,
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => Promise<void>;
};

export function CalendarWithDataProvider({
  calendarId,
  calendarName,
  initialMonth,
  initialWeekStart,
  permissions,
  saveEntryAction,
  moveEntryAction,
  saveScheduleAction,
  deleteScheduleAction,
  shiftScheduleAction,
}: Props) {
  const [displayMonth, setDisplayMonth] = useState(dayjs(`${initialMonth}-15`, "YYYY-MM-DD"));
  const [displayWeekStart, setDisplayWeekStart] = useState(initialWeekStart);

  const {
    rangeData,
    isLoading,
    futureCycles,
    forecastLabel,
    todayJst,
    baseMonth,
    setBaseMonth,
    refreshRange,
  } = useDashboardCalendar();

  // URL 由来の initialMonth/initialWeekStart が更新されたときに、表示状態と Provider の baseMonth を同期する。
  // （タブ遷移・戻る/進む・プリフェッチ後の遷移でも「見ていた月」が崩れないようにする）
  useEffect(() => {
    const nextMonth = initialMonth;
    const nextWeekStart = initialWeekStart;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayMonth(dayjs(`${nextMonth}-15`, "YYYY-MM-DD"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayWeekStart(nextWeekStart);
    setBaseMonth(nextMonth);
  }, [initialMonth, initialWeekStart, setBaseMonth]);

  const { days } = useMemo(() => {
    if (!rangeData) {
      return { days: [] as DayData[] };
    }
    const entries = rangeData.entries as ScheduleEntryRow[];

    // from/to はフック内部で決まっているが、days 用には現在の表示月に近い範囲だけ組み立てれば良い。
    const monthStart = displayMonth.startOf("month");
    const monthEnd = displayMonth.endOf("month");
    const fromDate = monthStart.startOf("week").format("YYYY-MM-DD");
    const toDate = monthEnd.endOf("week").format("YYYY-MM-DD");

    const days: DayData[] = [];
    let cursor = dayjs(fromDate);
    const end = dayjs(toDate);
    const today = dayjs(todayJst);
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
  }, [rangeData, displayMonth, todayJst]);

  const events = (rangeData?.events ?? []) as EventRow[];
  const schedules = (rangeData?.schedules ?? []) as CalendarScheduleRow[];
  const rankState = rangeData?.rankState as
    | {
        rank_cycle_start_date: string;
        rank_reset_date: string;
        current_rank: string | null;
        skip_pass_remaining?: number | null;
      }
    | undefined;
  const rankCycleHistory = (rangeData?.rankCycleHistory ?? []) as {
    cycle_start_date: string;
    cycle_end_date: string;
    rank_during: string | null;
    cycle_total?: number | null;
  }[];

  const currentRankCycle =
    rankState && permissions.canViewRank
      ? {
          start: rankState.rank_cycle_start_date,
          end: rankState.rank_reset_date,
          rank: rankState.current_rank,
        }
      : null;

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
          setDisplayMonth(dayjs(`${month}-15`, "YYYY-MM-DD"));
          setBaseMonth(month);
        }}
        onChangeWeek={(_, weekStart) => {
          setDisplayWeekStart(weekStart);
          const m = dayjs(weekStart, "YYYY-MM-DD").startOf("month");
          setDisplayMonth(m);
          setBaseMonth(m.format("YYYY-MM"));
        }}
        moveEntry={async (id, from, to) => {
          if (!moveEntryAction) return;
          await moveEntryAction(id, from, to);
          refreshRange();
        }}
        saveAction={async (formData) => {
          if (!saveEntryAction) return;
          await saveEntryAction(formData);
          refreshRange();
        }}
        events={events}
        currentRankCycle={currentRankCycle}
        rankCycleHistory={rankCycleHistory}
        forecastLabel={forecastLabel}
        futureCycles={futureCycles}
        todayJst={todayJst}
        skipPassRemaining={rankState?.skip_pass_remaining ?? 0}
        schedules={schedules}
        saveScheduleAction={
          saveScheduleAction
            ? async (formData) => {
                const result = await saveScheduleAction(formData);
                if (result && "ok" in result && result.ok) {
                  refreshRange();
                }
                return result;
              }
            : undefined
        }
        deleteScheduleAction={deleteScheduleAction}
        shiftScheduleAction={
          shiftScheduleAction
            ? async (scheduleId, mode, newStartDate, newStartTime) => {
                await shiftScheduleAction(
                  calendarId,
                  scheduleId,
                  mode,
                  newStartDate,
                  newStartTime
                );
                refreshRange();
              }
            : undefined
        }
      />
    </>
  );
}

