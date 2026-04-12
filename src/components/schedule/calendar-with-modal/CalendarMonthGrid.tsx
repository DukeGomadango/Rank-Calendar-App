"use client";

import dayjs from "dayjs";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { getRankBarDashedLineColorClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { SparklesIcon, NoteIcon } from "@/components/icons/DashboardIcons";
import type { ViewMode } from "@/lib/view-mode-context";
import {
  WEEKDAYS,
  SKIP_STRIPE_CLASS,
  getTargetActualDisplay,
  formatMinutesAsHoursMinutes,
  filterSchedulesForMonthCell,
  type PeriodType,
} from "./calendar-display-helpers";
import { MonthEventChips, MonthScheduleChips } from "./CalendarMonthCellChips";
import type { CycleInfoForDate, DayData } from "./types";

export type CalendarMonthGridProps = {
  permissions: CalendarPermissionFlags;
  viewMode: ViewMode;
  streamTimeTotals: { plannedMinutes: number; actualMinutes: number };
  monthWeeks: DayData[][];
  todayStr: string;
  eventsByDate: Map<string, EventRow[]>;
  schedulesByDate: Map<string, CalendarScheduleRow[]>;
  getCycleForDate: (date: string) => CycleInfoForDate;
  getBarRoundedInRow: (
    date: string,
    rowDates: string[],
    cycleStart: string,
    cycleEnd: string
  ) => { roundedLeft: boolean; roundedRight: boolean };
  getPeriodCellClass: (periodType: PeriodType, isToday: boolean) => string;
  formatCycleBandLabel: (rank: string | null, cycleStart?: string, cycleEnd?: string) => string;
  onMonthDayActivate: (day: DayData) => void;
  onMoveEntryToDate: (fromDate: string, toDate: string) => void;
};

export function CalendarMonthGrid({
  permissions,
  viewMode,
  streamTimeTotals,
  monthWeeks,
  todayStr,
  eventsByDate,
  schedulesByDate,
  getCycleForDate,
  getBarRoundedInRow,
  getPeriodCellClass,
  formatCycleBandLabel,
  onMonthDayActivate,
  onMoveEntryToDate,
}: CalendarMonthGridProps) {
  return (
    <section className="flex min-h-[calc(100vh-220px)] flex-col rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      {(permissions.isOwner || permissions.canViewScheduleStream) && (
        <div className="mb-1 flex flex-col gap-0.5">
          <div className="text-[10px] font-medium text-zinc-700 dark:text-zinc-200">
            配信予定時間合計：{formatMinutesAsHoursMinutes(streamTimeTotals.plannedMinutes)}
          </div>
          <div className="text-[10px] font-medium text-zinc-700 dark:text-zinc-200">
            配信時間実績合計：{formatMinutesAsHoursMinutes(streamTimeTotals.actualMinutes)}
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {WEEKDAYS.map((label, idx) => {
          const isSun = idx === 0;
          const isSat = idx === 6;
          const base = "py-1 text-center font-medium tracking-tight bg-zinc-50 dark:bg-zinc-900";
          const weekend =
            isSun || isSat
              ? isSun
                ? "text-red-500"
                : "text-blue-500"
              : "text-zinc-600 dark:text-zinc-300";
          return (
            <div key={label} className={`${base} ${weekend}`}>
              {label}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-px">
        {monthWeeks.map((weekDays, weekIdx) => {
          const rowDates = weekDays.map((d) => d.date);
          return (
            <div
              key={weekIdx}
              className="grid min-h-[100px] flex-1 grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800"
            >
              {weekDays.map((day, dayIdx) => {
                const dateObj = dayjs(day.date);
                const cycle = getCycleForDate(day.date);
                const rounded = cycle
                  ? getBarRoundedInRow(day.date, rowDates, cycle.start, cycle.end)
                  : null;
                const bg = cycle
                  ? getPeriodCellClass(cycle.periodType, day.isToday)
                  : day.isToday
                    ? "bg-accent-50 dark:bg-accent-950/40"
                    : "bg-white dark:bg-zinc-900";
                const isCycleEnd = cycle && day.date === cycle.end;

                let textColor = "text-zinc-800 dark:text-zinc-100";
                if (!day.isCurrentMonth) {
                  textColor = "text-zinc-400 dark:text-zinc-500";
                } else if (day.holidayName || day.weekday === 0) {
                  textColor = "text-red-500";
                } else if (day.weekday === 6) {
                  textColor = "text-blue-500";
                }
                if (cycle?.periodType === "past") {
                  textColor = "text-zinc-500 dark:text-zinc-400";
                }

                const entry = day.entries[0];
                const isSkip = entry?.skip_pass_used ?? false;
                const hasEntry = day.entries.length > 0;
                const canDrop =
                  permissions.isOwner && (!day.entries.length || !entry?.skip_pass_used);
                const showEventIcon = permissions.canViewEvents && entry?.event_id;
                const showMemoIcon = permissions.canViewMemo && entry?.memo?.trim();
                const eventsOnDay = permissions.canViewEvents ? eventsByDate.get(day.date) ?? [] : [];
                const showBordersInCell = permissions.canViewBorders && viewMode === "detailed";

                const daySchedules = (schedulesByDate.get(day.date) ?? []).filter(
                  (s) => s.date === day.date
                );
                const monthSchedules = filterSchedulesForMonthCell(daySchedules);

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => onMonthDayActivate(day)}
                    onDragOver={(e) => {
                      if (canDrop) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!canDrop || !permissions.isOwner) return;
                      const fromDate = e.dataTransfer.getData("text/plain");
                      if (!fromDate || fromDate === day.date) return;
                      onMoveEntryToDate(fromDate, day.date);
                    }}
                    style={{ gridColumn: dayIdx + 1 }}
                    className={`${isSkip ? SKIP_STRIPE_CLASS : bg} relative flex min-h-0 min-w-0 flex-col border p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${day.isToday ? "border-2 border-accent-500 ring-2 ring-accent-500/30 dark:border-accent-400 dark:ring-accent-400/30" : "border-zinc-200/80 dark:border-zinc-800/80"}`}
                  >
                    {cycle && permissions.canViewRank && (() => {
                      const showBracket = !isSkip;
                      const isPhaseStart = day.date === cycle.start;
                      const isPhaseEnd = day.date === cycle.end;
                      const vertStrong = !!(
                        (rounded?.roundedLeft && isPhaseStart) ||
                        (rounded?.roundedRight && isPhaseEnd)
                      );
                      const vertClass = getRankBarVerticalBorderClass(cycle.rank, vertStrong);
                      return (
                        <div
                          className={`mt-0.5 flex items-center gap-0.5 overflow-visible ${showBracket && rounded?.roundedLeft ? "rounded-tl-sm border-l-2 " + vertClass : ""} ${showBracket && rounded?.roundedRight ? "rounded-tr-sm border-r-2 " + vertClass : ""}`}
                          title={
                            formatCycleBandLabel(cycle.rank, cycle.start, cycle.end) +
                            (cycle.isPredicted ? "（予測）" : "")
                          }
                        >
                          {cycle.isPredicted ? (
                            <div
                              className={`min-w-0 flex-1 h-0 border-t-2 md:border-t-4 ${getRankBarDashedLineColorClass(cycle.rank)}`}
                            />
                          ) : (
                            <div className={`h-0.5 md:h-1 min-w-0 flex-1 ${getRankBarLineClass(cycle.rank)}`} />
                          )}
                          <span
                            className={`shrink-0 text-[7px] md:text-[8px] font-medium ${getRankBarTextClass(cycle.rank)}`}
                          >
                            {cycle.rank ?? "—"}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-1">
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:hidden">
                        <div className="flex items-center justify-between gap-0.5">
                          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${textColor}`}>
                            {dateObj.date()}
                            {showEventIcon && (
                              <span className="inline-flex text-zinc-500 dark:text-zinc-300" title="イベント">
                                <SparklesIcon className="h-3 w-3" />
                              </span>
                            )}
                            {showMemoIcon && (
                              <span className="inline-flex text-zinc-500 dark:text-zinc-300" title="メモ">
                                <NoteIcon className="h-3 w-3" />
                              </span>
                            )}
                          </span>
                          {day.isToday && (
                            <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[9px] font-medium text-white shrink-0">
                              今日
                            </span>
                          )}
                        </div>
                        {day.holidayName && !isSkip && (
                          <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-900/40 dark:text-red-200">
                            <span className="shrink-0 text-[9px]">祝</span>
                            <span className="min-w-0 truncate">{day.holidayName}</span>
                          </span>
                        )}
                        {permissions.canViewEvents && eventsOnDay.length > 0 && (
                          <MonthEventChips events={eventsOnDay} dayDate={day.date} density="compact" />
                        )}
                        {!isSkip && monthSchedules.length > 0 && (
                          <MonthScheduleChips schedules={monthSchedules} density="compact" />
                        )}
                        {!hasEntry && !isSkip && permissions.canEditSchedule && (
                          <p className="mt-1 flex-1 text-[8px] text-zinc-400 dark:text-zinc-500 line-clamp-2">
                            ここに予定を追加
                          </p>
                        )}
                        {isSkip ? (
                          <div className="mt-1 flex min-h-0 flex-1 items-center justify-center">
                            <span
                              className="text-[8px] font-medium text-teal-600/80 dark:text-teal-400/80"
                              title="スキパ使用日"
                            >
                              スキパ
                            </span>
                          </div>
                        ) : (
                          hasEntry &&
                          permissions.canViewTargetActual && (
                            <div className="mt-1 flex w-full min-w-0 flex-col items-stretch gap-0.5">
                              {day.entries.map((e) => {
                                const disp = getTargetActualDisplay(
                                  e.target_plus,
                                  e.actual_plus,
                                  day.date > todayStr,
                                  true
                                );
                                return (
                                  <div
                                    key={e.id}
                                    className="flex w-full min-w-0 items-center justify-center gap-0.5"
                                  >
                                    <span
                                      className={`min-w-0 max-w-[48%] truncate text-center ${disp.targetClass}`}
                                      title="目標"
                                    >
                                      {disp.targetLabel}
                                    </span>
                                    <span className="shrink-0 text-[7px] text-zinc-400 dark:text-zinc-500">/</span>
                                    <span
                                      className={`min-w-0 max-w-[48%] truncate text-center ${disp.actualClass}`}
                                      title="実績"
                                    >
                                      {disp.actualLabel}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}
                      </div>
                      <div className="hidden md:flex flex-1 flex-col">
                        <div className="flex items-center justify-between gap-0.5">
                          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${textColor}`}>
                            {dateObj.date()}
                            {showEventIcon && (
                              <span className="inline-flex text-zinc-500 dark:text-zinc-300" title="イベント">
                                <SparklesIcon className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {showMemoIcon && (
                              <span className="inline-flex text-zinc-500 dark:text-zinc-300" title="メモ">
                                <NoteIcon className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </span>
                          {day.isToday && (
                            <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[9px] font-medium text-white shrink-0">
                              今日
                            </span>
                          )}
                        </div>
                        {day.holidayName && !isSkip && (
                          <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-900/40 dark:text-red-200">
                            <span className="shrink-0 text-[9px]">祝</span>
                            <span className="min-w-0 truncate">{day.holidayName}</span>
                          </span>
                        )}
                        {permissions.canViewEvents && eventsOnDay.length > 0 && (
                          <MonthEventChips events={eventsOnDay} dayDate={day.date} density="comfortable" />
                        )}
                        {!isSkip && monthSchedules.length > 0 && (
                          <MonthScheduleChips schedules={monthSchedules} density="comfortable" />
                        )}
                        {!hasEntry && !isSkip && permissions.canEditSchedule && (
                          <p className="mt-1 flex-1 text-[9px] text-zinc-400 dark:text-zinc-500 line-clamp-2">
                            ここに予定を追加
                          </p>
                        )}
                        {isSkip ? (
                          <div className="mt-1 flex flex-1 items-center justify-center min-h-0">
                            <span
                              className="text-[8px] font-medium text-teal-600/80 dark:text-teal-400/80"
                              title="スキパ使用日"
                            >
                              スキパ
                            </span>
                          </div>
                        ) : (
                          hasEntry && (
                            <div className="mt-1 flex flex-wrap items-center gap-0.5">
                              {day.entries.map((e) => {
                                const disp = getTargetActualDisplay(
                                  e.target_plus,
                                  e.actual_plus,
                                  day.date > todayStr
                                );
                                return permissions.canViewTargetActual ? (
                                  <span key={e.id} className="inline-flex items-center gap-0.5">
                                    <span className={disp.targetClass} title="目標">
                                      {disp.targetLabel}
                                    </span>
                                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500">/</span>
                                    <span className={disp.actualClass} title="実績">
                                      {disp.actualLabel}
                                    </span>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )
                        )}
                        {showBordersInCell && hasEntry && entry && (
                          <p className="mt-0.5 line-clamp-1 text-[8px] text-zinc-400 dark:text-zinc-500">
                            +2:{entry.border_plus2 ?? "-"} +4:{entry.border_plus4 ?? "-"} +6:
                            {entry.border_plus6 ?? "-"}
                          </p>
                        )}
                        {isCycleEnd &&
                          permissions.canViewRank &&
                          !cycle.isPredicted &&
                          cycle.periodType === "past" &&
                          cycle.cycleTotal != null && (
                            <p className="mt-0.5 text-[7px] text-zinc-400 dark:text-zinc-500" title="周期の最終合計">
                              🏁 +{cycle.cycleTotal}
                            </p>
                          )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
