"use client";

import { Fragment, useMemo } from "react";
import dayjs from "dayjs";
import {
  assignWeekColumnLayout,
  MINUTES_PER_DAY,
  WEEK_VIEW_SLOT_MINUTES,
  type WeekViewSegment,
} from "@/lib/domain/week-view-layout";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { getRankBarDashedLineColorClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { getEventColorClasses } from "@/lib/event-colors";
import { WeekScheduleBlockPopover } from "../WeekScheduleBlockPopover";
import {
  scheduleShowsInWeekAllDayRow,
  scheduleShowsInWeekTimeGrid,
} from "@/lib/domain/schedule-week-display";
import { WEEKDAYS } from "./calendar-display-helpers";
import type { CalendarWeekGridProps } from "./week/calendar-week-grid-types";
import { createWeekGridTimeHelpers } from "./week/weekGridTimeHelpers";

export type {
  CalendarWeekGridProps,
  ScheduleCreatePrefill,
  ScheduleCreateSelection,
  ScheduleDragPreview,
  ScheduleResizePreview,
} from "./week/calendar-week-grid-types";

export function CalendarWeekGrid(props: CalendarWeekGridProps) {
  const {
    weekTimeGridRef,
    onWeekGridKeyDown,
    permissions,
    currentRankCycle,
    weekDays,
    localDays,
    eventsByDate,
    schedulesByDate,
    getCycleForDate,
    getBarRoundedInRow,
    getPeriodCellClass,
    formatCycleBandLabel,
    saveScheduleAction,
    shiftScheduleAction,
    deleteScheduleAction,
    resizeScheduleAction,
    selectedScheduleId,
    weekSchedulePreviewOpen,
    setWeekSchedulePreviewOpen,
    setSelectedDate,
    setSelectedScheduleId,
    setIsDayEditModalOpen,
    setModalTab,
    setScheduleCreatePrefill,
    setScheduleCreateSelection,
    scheduleCreateSelection,
    scheduleCreateSelectionRef,
    scheduleDragPreview,
    setScheduleDragPreview,
    scheduleResizePreview,
    setScheduleResizePreview,
    scheduleDragDurationMsRef,
    scheduleShiftPendingRef,
    applyOptimisticScheduleShift,
    applyOptimisticSchedulePatch,
    mutateRange,
    showToast,
  } = props;


  // 各列は「カレンダー日 D の 0:00 〜 翌日 0:00（24h）」。
  // 旧: 5:00〜翌3:00 の22h軸だと、翌日未明の部分が前日列に吸い込まれ水曜列に出ない・帯が不自然になる。
  const totalMinutes = 24 * 60;
  const msPerMinute = 60 * 1000;
  const canCreate = permissions.canEditSchedule && !!saveScheduleAction;
  const canShift = permissions.canEditSchedule && !!shiftScheduleAction;
  const canResize = canShift && !!resizeScheduleAction;

  const {
    wallClockHHMM,
    toUtcMs,
    formatHHMMFromUtcMs,
    formatYMDFromUtcMs,
    pointerYToSnappedMinutes,
    snapDeltaMinutesFromDrag,
    getScheduleSpanMs,
  } = useMemo(() => createWeekGridTimeHelpers(totalMinutes), [totalMinutes]);

  const hours: number[] = [];
  for (let h = 0; h < 24; h += 1) {
    hours.push(h);
  }

  const weekDates = weekDays.map((d) => d.date);

  const weekAlldayTimeLabel = (s: CalendarScheduleRow) =>
    s.end_date && s.end_date !== s.date ? `終日〜${s.end_date.slice(5)}` : "終日";

  return (
    <section
      ref={weekTimeGridRef}
      tabIndex={0}
      onKeyDown={onWeekGridKeyDown}
      className="flex min-h-[calc(100vh-220px)] flex-col overflow-x-auto [scrollbar-gutter:stable] rounded-xl border border-zinc-200 bg-white/80 px-0 py-3 text-xs shadow-sm outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-accent-500 dark:border-zinc-800 dark:bg-zinc-900/80"
    >
      <div className="mt-1 flex min-h-0 flex-col overflow-y-hidden w-full">
        <div className="flex min-h-0 flex-col gap-2 shrink-0">
          <div className="shrink-0 space-y-2 bg-white/95 pb-2 backdrop-blur-md dark:bg-zinc-900/95">
            <div className="flex w-full min-w-[1316px] rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
              {/* Corner: 左の時刻軸幅を予約 */}
              <div className="sticky left-0 z-0 flex w-14 shrink-0 items-center justify-center border-r border-zinc-200 bg-zinc-100 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                曜日
              </div>
              {weekDays.map((day, idx) => {
                const isSun = idx === 0;
                const isSat = idx === 6;
                const borderRight =
                  idx === 6 ? "" : "border-r border-zinc-200 dark:border-zinc-800";
                const base =
                  "py-1 text-center font-medium tracking-tight bg-zinc-50 dark:bg-zinc-900";
                const weekend =
                  isSun || isSat
                    ? isSun
                      ? "text-red-500"
                      : "text-blue-500"
                    : "text-zinc-600 dark:text-zinc-300";
                const dateObj = dayjs(day.date);
                return (
                  <div
                    key={day.date}
                    className={`${base} ${weekend} ${borderRight} flex-1 min-w-[180px] flex flex-col items-center justify-center`}
                  >
                    <div>{WEEKDAYS[idx]}</div>
                    <div className="text-[10px]">{dateObj.format("M/D")}</div>
                  </div>
                );
              })}
            </div>
        {/* ランク帯（簡略版） */}
        {permissions.canViewRank && currentRankCycle && (
          <div className="flex w-full min-w-[1316px] rounded-lg bg-zinc-200 text-[10px] dark:bg-zinc-800">
            <div className="sticky left-0 z-0 flex w-14 shrink-0 items-center justify-center border-r border-zinc-200 bg-zinc-100 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              ランク
            </div>
            {weekDays.map((day, idx) => {
              const cycle = getCycleForDate(day.date);
              const weekRowDates = weekDates;
              const rounded = cycle
                ? getBarRoundedInRow(day.date, weekRowDates, cycle.start, cycle.end)
                : null;
              const bg =
                cycle
                  ? getPeriodCellClass(cycle.periodType, day.isToday)
                  : day.isToday
                    ? "bg-accent-50 dark:bg-accent-950/40"
                    : "bg-white dark:bg-zinc-900";
              const borderRight = idx === 6 ? "" : "border-r border-zinc-200 dark:border-zinc-800";
              return (
                <div
                  key={day.date}
                  className={`${bg} relative flex-1 min-w-[180px] flex items-center justify-center px-1 py-0.5 text-[10px] ${borderRight}`}
                >
                  {cycle && (() => {
                    const showBracket = true;
                    const isPhaseStart = day.date === cycle.start;
                    const isPhaseEnd = day.date === cycle.end;
                    const vertStrong = !!((rounded?.roundedLeft && isPhaseStart) || (rounded?.roundedRight && isPhaseEnd));
                    const vertClass = getRankBarVerticalBorderClass(cycle.rank, vertStrong);
                    return (
                      <div
                        className={`flex w-full items-center gap-0.5 ${showBracket && rounded?.roundedLeft ? "rounded-l border-l-2 " + vertClass : ""} ${showBracket && rounded?.roundedRight ? "rounded-r border-r-2 " + vertClass : ""}`}
                        title={formatCycleBandLabel(cycle.rank, cycle.start, cycle.end) + (cycle.isPredicted ? "（予測）" : "")}
                      >
                        {cycle.isPredicted ? (
                          <div className={`h-0.5 flex-1 border-t-2 ${getRankBarDashedLineColorClass(cycle.rank)}`} />
                        ) : (
                          <div className={`h-0.5 flex-1 ${getRankBarLineClass(cycle.rank)}`} />
                        )}
                        <span className={`shrink-0 text-[9px] font-medium ${getRankBarTextClass(cycle.rank)}`}>
                          {cycle.rank ?? "—"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* イベント帯（ランク帯とタイムラインの間。月ビューと同様の複数日帯） */}
        {permissions.canViewEvents && (
          <div className="flex w-full min-w-[1316px] rounded-lg bg-zinc-200 text-[10px] dark:bg-zinc-800">
            <div className="sticky left-0 z-0 flex w-14 shrink-0 items-center justify-center border-r border-zinc-200 bg-zinc-100 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              イベント
            </div>
            {weekDays.map((day, idx) => {
              const eventsOnDay = eventsByDate.get(day.date) ?? [];
              const cycle = getCycleForDate(day.date);
              const cellBg =
                cycle
                  ? getPeriodCellClass(cycle.periodType, day.isToday)
                  : day.isToday
                    ? "bg-accent-50/40 dark:bg-accent-950/30"
                    : "bg-white dark:bg-zinc-900";
              const borderRight = idx === 6 ? "" : "border-r border-zinc-200 dark:border-zinc-800";
              return (
                <div
                  key={`week-events-${day.date}`}
                  className={`${cellBg} min-h-[2.75rem] flex-1 min-w-[180px] px-1 py-1 ${borderRight}`}
                >
                  {eventsOnDay.length > 0 && (
                    <div className="flex flex-col gap-px">
                      {eventsOnDay.map((ev) => {
                        const isStart =
                          ev.start_date != null && ev.start_date === day.date;
                        const isEnd =
                          ev.end_date != null && ev.end_date === day.date;
                        const { border, bg, text } = getEventColorClasses(
                          ev.color ?? null
                        );
                        return (
                          <div
                            key={`${ev.id}-${day.date}`}
                            className={`${bg} py-px text-[9px] font-medium line-clamp-2 ${text} ${isStart ? "rounded-l border-l-4 pl-1 " + border : "pl-0.5"} ${isEnd ? "rounded-r" : ""}`}
                            title={ev.name}
                          >
                            {isStart ? ev.name : "\u00A0"}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

          <div className="flex w-full min-w-[1316px] rounded-lg bg-zinc-200 text-[10px] dark:bg-zinc-800">
            <div className="sticky left-0 z-0 flex w-14 shrink-0 items-center justify-center border-r border-zinc-200 bg-zinc-100 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              終日
            </div>
            {weekDays.map((day, idx) => {
              const rawList = schedulesByDate.get(day.date) ?? [];
              const allDaySchedules = rawList.filter(scheduleShowsInWeekAllDayRow);
              const cycle = getCycleForDate(day.date);
              const cellBg =
                cycle
                  ? getPeriodCellClass(cycle.periodType, day.isToday)
                  : day.isToday
                    ? "bg-accent-50/40 dark:bg-accent-950/30"
                    : "bg-white dark:bg-zinc-900";
              const borderRight = idx === 6 ? "" : "border-r border-zinc-200 dark:border-zinc-800";

              return (
                <div
                  key={`week-allday-${day.date}`}
                  className={`${cellBg} flex-1 min-w-[180px] flex min-h-[2.5rem] flex-col gap-px px-1 py-1 ${borderRight}`}
                  onDragOver={(e) => {
                    if (!canShift) return;
                    e.preventDefault();
                  }}
                  onDrop={async (e) => {
                    if (!canShift) return;
                    e.preventDefault();
                    const scheduleId = e.dataTransfer.getData("calendar/scheduleId");
                    const modeRaw = e.dataTransfer.getData("calendar/mode");
                    const isAllDayRaw = e.dataTransfer.getData("calendar/isAllDay");
                    if (!scheduleId) return;
                    if (isAllDayRaw !== "1") return;
                    const mode = modeRaw === "copy" ? "copy" : "move";

                    const optimistic = applyOptimisticScheduleShift(
                      scheduleId,
                      mode,
                      day.date,
                      null
                    );
                    scheduleShiftPendingRef.current += 1;
                    try {
                      await shiftScheduleAction?.(scheduleId, mode, day.date, null);
                      setScheduleCreatePrefill(null);
                      setScheduleCreateSelection(null);
                      setSelectedScheduleId(null);
                      setWeekSchedulePreviewOpen(false);
                    } catch {
                      if (optimistic.applied) optimistic.rollback();
                      showToast("移動に失敗しました");
                    } finally {
                      scheduleShiftPendingRef.current = Math.max(
                        0,
                        scheduleShiftPendingRef.current - 1
                      );
                      if (scheduleShiftPendingRef.current === 0) {
                        void mutateRange();
                      }
                    }
                  }}
                >
                  {allDaySchedules.map((s) => {
                    const color = getEventColorClasses(s.color_id ?? null);
                    const inner = (
                      <div
                        data-schedule-block="1"
                        draggable={canShift}
                        onDragStart={(e) => {
                          if (!canShift) return;
                          scheduleDragDurationMsRef.current = 0;
                          const mode = e.ctrlKey || e.metaKey ? "copy" : "move";
                          e.dataTransfer.setData("calendar/scheduleId", s.id);
                          e.dataTransfer.setData("calendar/mode", mode);
                          e.dataTransfer.setData("calendar/isAllDay", "1");
                          e.dataTransfer.effectAllowed = mode === "copy" ? "copy" : "move";
                        }}
                        onClick={
                          permissions.canEditSchedule
                            ? (ev) => {
                                ev.stopPropagation();
                                setSelectedDate(day.date);
                                setSelectedScheduleId(s.id);
                                // 予定を1クリックで編集モーダルへ（プレビューは表示しない）
                                setIsDayEditModalOpen(true);
                                setWeekSchedulePreviewOpen(false);
                                setModalTab("schedule");
                                setScheduleCreatePrefill(null);
                                setScheduleCreateSelection(null);
                                void weekTimeGridRef.current?.focus();
                              }
                            : undefined
                        }
                        className={`${color.bg} ${color.text} mb-px w-full cursor-pointer rounded-l py-px pl-1 text-left text-[9px] font-medium line-clamp-2 ${color.leftBar}`}
                        title={s.title}
                      >
                        <span className="block truncate">{s.title}</span>
                      </div>
                    );

                    return (
                      <Fragment key={s.id}>
                        {permissions.canEditSchedule ? (
                          <WeekScheduleBlockPopover
                            opened={
                              selectedScheduleId === s.id && weekSchedulePreviewOpen
                            }
                            onOpenChange={(open) => {
                              if (!open) setWeekSchedulePreviewOpen(false);
                            }}
                            schedule={s}
                            timeLabel={weekAlldayTimeLabel(s)}
                            memoPreview={
                              s.memo?.trim() ? s.memo.trim().slice(0, 120) : null
                            }
                            canDelete={!!deleteScheduleAction}
                            onEdit={() => {
                              setWeekSchedulePreviewOpen(false);
                              setIsDayEditModalOpen(true);
                              setModalTab("schedule");
                              setScheduleCreatePrefill(null);
                            }}
                            onDelete={async () => {
                              if (!deleteScheduleAction) return;
                              try {
                                await deleteScheduleAction(s.id);
                                setWeekSchedulePreviewOpen(false);
                                setSelectedScheduleId(null);
                                showToast("削除しました");
                                void mutateRange();
                              } catch {
                                showToast("削除に失敗しました");
                              }
                            }}
                          >
                            {inner}
                          </WeekScheduleBlockPopover>
                        ) : (
                          inner
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
          </div>

        {/* 時間グリッド本体 */}
        <div className="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-lg border border-zinc-200 bg-zinc-100 text-[11px] dark:border-zinc-800 dark:bg-zinc-900">
          {/* 時刻軸 */}
          <div className="sticky left-0 z-10 flex w-14 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100 text-[10px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            {hours.map((h) => (
              <div
                key={h}
                className="h-12 px-1 text-right leading-none"
              >
                {`${h.toString().padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* 日別カラム */}
          <div className="flex w-full min-w-[1316px]">
            {weekDays.map((day) => {
              const daySchedulesRaw = schedulesByDate.get(day.date) ?? [];
              const daySchedules = daySchedulesRaw.filter(scheduleShowsInWeekTimeGrid);
              const daySelection =
                scheduleCreateSelection?.dayDate === day.date
                  ? scheduleCreateSelection
                  : null;
              const bg = day.isToday
                ? "bg-accent-50/40 dark:bg-accent-950/30"
                : "bg-white dark:bg-zinc-950/40";
              const axisStartMs = toUtcMs(day.date, "00:00");
              const axisEndDate = dayjs(day.date).add(1, "day").format("YYYY-MM-DD");
              const axisEndMs = toUtcMs(axisEndDate, "00:00");
              const axisLengthMs = totalMinutes * msPerMinute;

              return (
                <div
                  key={day.date}
                  className="relative flex-1 min-w-[180px] flex flex-col border-r border-zinc-200 last:border-r-0 dark:border-zinc-800"
                >
                  {/* 時間スロット */}
                  <div
                    data-week-day-grid
                    className={`${bg} relative h-[1152px]`}
                    onDragOver={(e) => {
                      if (!canShift) return;
                      e.preventDefault();
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const m = pointerYToSnappedMinutes(rect, e.clientY);
                      const dur = scheduleDragDurationMsRef.current;
                      if (dur <= 0) return;
                      const hh = Math.floor(m / 60);
                      const mm = m % 60;
                      const startTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
                      const startMs = toUtcMs(day.date, `${startTime}:00`);
                      const endMs = startMs + dur;
                      const endTime = formatHHMMFromUtcMs(endMs);
                      setScheduleDragPreview({
                        columnDate: day.date,
                        startTime,
                        endTime,
                      });
                    }}
                    onDragLeave={() => {
                      setScheduleDragPreview((prev) =>
                        prev?.columnDate === day.date ? null : prev
                      );
                    }}
                    onDrop={async (e) => {
                      if (!canShift) return;
                      e.preventDefault();
                      setScheduleDragPreview(null);
                      const scheduleId = e.dataTransfer.getData("calendar/scheduleId");
                      const modeRaw = e.dataTransfer.getData("calendar/mode");
                      const isAllDayRaw = e.dataTransfer.getData("calendar/isAllDay");
                      if (!scheduleId) return;
                      if (isAllDayRaw === "1") return;
                      const mode = modeRaw === "copy" ? "copy" : "move";

                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const m = pointerYToSnappedMinutes(rect, e.clientY);
                      const hh = Math.floor(m / 60);
                      const mm = m % 60;
                      const newStartTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
                      const newStartDate = day.date;

                      const optimistic = applyOptimisticScheduleShift(
                        scheduleId,
                        mode,
                        newStartDate,
                        newStartTime
                      );
                      scheduleShiftPendingRef.current += 1;
                      try {
                        await shiftScheduleAction?.(scheduleId, mode, newStartDate, newStartTime);
                        setScheduleCreatePrefill(null);
                        setScheduleCreateSelection(null);
                        setSelectedScheduleId(null);
                        setWeekSchedulePreviewOpen(false);
                      } catch {
                        if (optimistic.applied) optimistic.rollback();
                        showToast("移動に失敗しました");
                      } finally {
                        scheduleShiftPendingRef.current = Math.max(
                          0,
                          scheduleShiftPendingRef.current - 1
                        );
                        if (scheduleShiftPendingRef.current === 0) {
                          void mutateRange();
                        }
                      }
                    }}
                    onPointerDown={(e) => {
                      if (!canCreate) return;
                      if ((e.target as HTMLElement | null)?.closest?.("[data-schedule-block]")) return;
                      if ((e.target as HTMLElement | null)?.closest?.("[data-resize-handle]")) return;

                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const offsetMinutes = pointerYToSnappedMinutes(rect, e.clientY);

                      setSelectedScheduleId(null);
                      setWeekSchedulePreviewOpen(false);
                      setScheduleCreatePrefill(null);
                      setScheduleCreateSelection({
                        dayDate: day.date,
                        startOffsetMinutes: offsetMinutes,
                        endOffsetMinutes: offsetMinutes,
                      });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!canCreate) return;
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const offsetMinutes = pointerYToSnappedMinutes(rect, e.clientY);
                      setScheduleCreateSelection((prev) => {
                        if (!prev || prev.dayDate !== day.date) return prev;
                        return { ...prev, endOffsetMinutes: offsetMinutes };
                      });
                    }}
                    onPointerUp={(e) => {
                      if (!canCreate) return;
                      const sel = scheduleCreateSelectionRef.current;
                      if (!sel || sel.dayDate !== day.date) return;

                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const offsetMinutes = pointerYToSnappedMinutes(rect, e.clientY);

                      const startOffset = Math.min(sel.startOffsetMinutes, offsetMinutes);
                      const endOffset = Math.max(sel.startOffsetMinutes, offsetMinutes);
                      setScheduleCreateSelection(null);

                      if (endOffset - startOffset < WEEK_VIEW_SLOT_MINUTES) {
                        setSelectedDate(day.date);
                        setIsDayEditModalOpen(true);
                        setWeekSchedulePreviewOpen(false);
                        setModalTab("rank");
                        setScheduleCreatePrefill(null);
                        return;
                      }

                      const startTimeMinutes = startOffset;
                      const endTimeMinutes = Math.max(
                        endOffset,
                        startOffset + WEEK_VIEW_SLOT_MINUTES
                      );
                      const startDate = day.date;
                      const endDate = day.date;
                      const startHh = String(Math.floor(startTimeMinutes / 60)).padStart(2, "0");
                      const startMm = String(startTimeMinutes % 60).padStart(2, "0");
                      const endHh = String(Math.floor(endTimeMinutes / 60)).padStart(2, "0");
                      const endMm = String(endTimeMinutes % 60).padStart(2, "0");

                      const localDateSet = new Set(localDays.map((d) => d.date));
                      if (!localDateSet.has(startDate) || !localDateSet.has(endDate)) {
                        showToast("範囲が表示範囲外です");
                        return;
                      }

                      setSelectedDate(startDate);
                      setSelectedScheduleId(null);
                      setIsDayEditModalOpen(true);
                      setWeekSchedulePreviewOpen(false);
                      setModalTab("schedule");
                      setScheduleCreatePrefill({
                        is_all_day: false,
                        startTime: `${startHh}:${startMm}`,
                        endTime: `${endHh}:${endMm}`,
                        endDate,
                      });
                    }}
                    onPointerCancel={() => {
                      if (canCreate) setScheduleCreateSelection(null);
                    }}
                  >
                    {/* 15分刻みの補助線（予定ブロックと同じ%基準で描画してズレを防止） */}
                    {Array.from(
                      { length: totalMinutes / WEEK_VIEW_SLOT_MINUTES },
                      (_, i) => i
                    )
                      .filter((i) => i % 4 !== 0) // 0,60分はメジャー線（hours.map）側に任せる
                      .map((i) => {
                        const minutes = i * WEEK_VIEW_SLOT_MINUTES;
                        const topPct = (minutes / totalMinutes) * 100;
                        return (
                          <div
                            key={`minor-${i}`}
                            className="pointer-events-none absolute left-0 right-0 border-t border-zinc-300/60 dark:border-zinc-600/45"
                            style={{ top: `${topPct}%` }}
                          />
                        );
                      })}
                    <div className="relative z-[1] h-full w-full">
                    {/* 範囲選択（新規登録）プレビュー */}
                    {daySelection && (() => {
                      const startOffset = Math.min(daySelection.startOffsetMinutes, daySelection.endOffsetMinutes);
                      const endOffset = Math.max(daySelection.startOffsetMinutes, daySelection.endOffsetMinutes);
                      const top = (startOffset / totalMinutes) * 100;
                      const height = ((endOffset - startOffset) / totalMinutes) * 100;
                      return (
                        <div
                          className="pointer-events-none absolute left-1 right-1 rounded-md bg-accent-500/20 border border-accent-400/60"
                          style={{ top: `${top}%`, height: `${height}%` }}
                        />
                      );
                    })()}
                    {hours.map((h) => (
                      <div
                        key={`gh-${h}`}
                        className="pointer-events-none absolute left-0 right-0 border-t border-zinc-300/80 dark:border-zinc-600/70"
                        style={{ top: `${(h / 24) * 100}%` }}
                      />
                    ))}

                    {scheduleDragPreview &&
                      scheduleDragPreview.columnDate === day.date &&
                      (() => {
                        const dur = scheduleDragDurationMsRef.current;
                        if (dur <= 0) return null;
                        const startMs = toUtcMs(day.date, `${scheduleDragPreview.startTime}:00`);
                        const endMs = startMs + dur;
                        const top = ((startMs - axisStartMs) / axisLengthMs) * 100;
                        const height = ((endMs - startMs) / axisLengthMs) * 100;
                        return (
                          <div
                            className="pointer-events-none absolute left-1 right-1 rounded-md border border-dashed border-accent-500/70 bg-accent-400/15 dark:bg-accent-500/10"
                            style={{ top: `${top}%`, height: `${Math.max(height, 1.2)}%` }}
                          >
                            <div className="px-1 py-0.5 text-[9px] font-medium text-accent-900 dark:text-accent-100">
                              {scheduleDragPreview.startTime} – {scheduleDragPreview.endTime}
                            </div>
                          </div>
                        );
                      })()}

                    {scheduleResizePreview &&
                      scheduleResizePreview.columnDate === day.date &&
                      (() => {
                        const p = scheduleResizePreview;
                        const segStartMs = Math.max(axisStartMs, p.startMs);
                        const segEndMs = Math.min(axisEndMs, p.endMs);
                        if (segEndMs <= segStartMs) return null;
                        const top = ((segStartMs - axisStartMs) / axisLengthMs) * 100;
                        const height = ((segEndMs - segStartMs) / axisLengthMs) * 100;
                        const startLabel = formatHHMMFromUtcMs(p.startMs);
                        const endLabel = formatHHMMFromUtcMs(p.endMs);
                        return (
                          <div
                            className="pointer-events-none absolute left-1 right-1 z-[40] rounded-md border border-dashed border-violet-500/80 bg-violet-400/20 dark:border-violet-400/70 dark:bg-violet-500/15"
                            style={{ top: `${top}%`, height: `${Math.max(height, 1.2)}%` }}
                          >
                            <div className="px-1 py-0.5 text-[9px] font-medium text-violet-950 dark:text-violet-100">
                              {startLabel} – {endLabel}
                            </div>
                          </div>
                        );
                      })()}

                    {(() => {
                      const layoutSegments: WeekViewSegment[] = [];
                      for (const s of daySchedules) {
                        if (!s.start_time || !s.end_time) continue;
                        const span = getScheduleSpanMs(s);
                        if (!span) continue;
                        const segStartMs = Math.max(axisStartMs, span.startMs);
                        const segEndMs = Math.min(axisEndMs, span.endMs);
                        if (segEndMs <= segStartMs) continue;
                        layoutSegments.push({ id: s.id, startMs: segStartMs, endMs: segEndMs });
                      }
                      const layoutMap = assignWeekColumnLayout(layoutSegments);

                      return daySchedules.map((s) => {
                        if (!s.start_time || !s.end_time) return null;

                        const span = getScheduleSpanMs(s);
                        if (!span) return null;
                        const { startMs: scheduleStartMs, endMs: scheduleEndMs } = span;

                        const segStartMs = Math.max(axisStartMs, scheduleStartMs);
                        const segEndMs = Math.min(axisEndMs, scheduleEndMs);
                        if (segEndMs <= segStartMs) return null;

                        const segMinutes = (segEndMs - segStartMs) / msPerMinute;
                        const displayMinutes = Math.max(30, segMinutes);
                        const displayEndMs = Math.min(
                          axisEndMs,
                          segStartMs + displayMinutes * msPerMinute
                        );

                        const top = ((segStartMs - axisStartMs) / axisLengthMs) * 100;
                        const height =
                          ((displayEndMs - segStartMs) / axisLengthMs) * 100;

                        const layout = layoutMap.get(s.id);
                        const col = layout?.column ?? 0;
                        const colCount = Math.max(1, layout?.columnCount ?? 1);
                        const gapPx = 2;
                        const leftPct = (col / colCount) * 100;
                        const widthPct = 100 / colCount;
                        const zBase = 8 + col;
                        const isSelected = selectedScheduleId === s.id;
                        const zFinal = isSelected ? 32 : zBase;

                        const color = getEventColorClasses(s.color_id ?? null);
                        const labelStart =
                          segStartMs > scheduleStartMs
                            ? formatHHMMFromUtcMs(segStartMs)
                            : (wallClockHHMM(s.start_time) ?? formatHHMMFromUtcMs(segStartMs));
                        const labelEnd =
                          segEndMs < scheduleEndMs
                            ? formatHHMMFromUtcMs(segEndMs)
                            : (wallClockHHMM(s.end_time) ?? formatHHMMFromUtcMs(segEndMs));
                        const labelRange = `${labelStart} – ${labelEnd}`;

                        const runResize = (edge: "start" | "end") => (ev: React.PointerEvent) => {
                          ev.stopPropagation();
                          ev.preventDefault();
                          if (!canResize || !resizeScheduleAction) return;
                          const gridEl = (ev.currentTarget as HTMLElement).closest(
                            "[data-week-day-grid]"
                          ) as HTMLDivElement | null;
                          if (!gridEl) return;
                          const rect = gridEl.getBoundingClientRect();
                          const fullSpan = getScheduleSpanMs(s);
                          if (!fullSpan) return;
                          const startY = ev.clientY;
                          const minDurMs = WEEK_VIEW_SLOT_MINUTES * msPerMinute;

                          const applyDelta = (deltaY: number) => {
                            const dMin = snapDeltaMinutesFromDrag(rect, deltaY);
                            let newStartMs = fullSpan.startMs;
                            let newEndMs = fullSpan.endMs;
                            if (edge === "start") {
                              newStartMs = fullSpan.startMs + dMin * msPerMinute;
                            } else {
                              newEndMs = fullSpan.endMs + dMin * msPerMinute;
                            }
                            if (newEndMs - newStartMs < minDurMs) {
                              if (edge === "start") {
                                newStartMs = newEndMs - minDurMs;
                              } else {
                                newEndMs = newStartMs + minDurMs;
                              }
                            }
                            return { newStartMs, newEndMs };
                          };

                          const onMove = (pe: PointerEvent) => {
                            const { newStartMs, newEndMs } = applyDelta(pe.clientY - startY);
                            if (newStartMs >= newEndMs) {
                              setScheduleResizePreview(null);
                              return;
                            }
                            setScheduleResizePreview({
                              columnDate: day.date,
                              scheduleId: s.id,
                              startMs: newStartMs,
                              endMs: newEndMs,
                            });
                          };

                          const cleanup = () => {
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);
                            window.removeEventListener("pointercancel", onCancel);
                            setScheduleResizePreview(null);
                          };

                          const onCancel = () => {
                            cleanup();
                          };

                          const onUp = async (pe: PointerEvent) => {
                            cleanup();
                            const deltaY = pe.clientY - startY;
                            const dMin = snapDeltaMinutesFromDrag(rect, deltaY);
                            let newStartMs = fullSpan.startMs;
                            let newEndMs = fullSpan.endMs;
                            if (edge === "start") {
                              newStartMs = fullSpan.startMs + dMin * msPerMinute;
                            } else {
                              newEndMs = fullSpan.endMs + dMin * msPerMinute;
                            }
                            if (newEndMs - newStartMs < minDurMs) {
                              showToast("範囲が短すぎます");
                              return;
                            }
                            if (newStartMs >= newEndMs) {
                              showToast("時刻が不正です");
                              return;
                            }

                            const ndS = formatYMDFromUtcMs(newStartMs);
                            const ntS = formatHHMMFromUtcMs(newStartMs);
                            const ndE = formatYMDFromUtcMs(newEndMs);
                            const ntE = formatHHMMFromUtcMs(newEndMs);

                            const nextRow: CalendarScheduleRow = {
                              ...s,
                              date: ndS,
                              end_date: ndE === ndS ? null : ndE,
                              start_time: `${ntS}:00`,
                              end_time: `${ntE}:00`,
                            };

                            const optimistic = applyOptimisticSchedulePatch(s.id, nextRow);
                            scheduleShiftPendingRef.current += 1;
                            try {
                              if (edge === "start") {
                                await resizeScheduleAction(s.id, "start", ndS, ntS);
                              } else {
                                await resizeScheduleAction(s.id, "end", ndE, ntE);
                              }
                              setScheduleCreatePrefill(null);
                              setScheduleCreateSelection(null);
                              setWeekSchedulePreviewOpen(false);
                            } catch {
                              if (optimistic.applied) optimistic.rollback();
                              showToast("リサイズに失敗しました");
                            } finally {
                              scheduleShiftPendingRef.current = Math.max(
                                0,
                                scheduleShiftPendingRef.current - 1
                              );
                              if (scheduleShiftPendingRef.current === 0) {
                                void mutateRange();
                              }
                            }
                          };
                          onMove(ev.nativeEvent);
                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                          window.addEventListener("pointercancel", onCancel);
                        };

                        const timedInner = (
                          <div
                            data-schedule-block="1"
                            draggable={canShift}
                            className={`group absolute overflow-hidden rounded-md border text-[10px] shadow-sm transition-[box-shadow,z-index,opacity] ${color.bg} ${color.text} ${color.leftBar} ${
                              scheduleResizePreview?.scheduleId === s.id
                                ? "opacity-45"
                                : ""
                            } ${
                              isSelected
                                ? "z-[32] ring-2 ring-accent-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950"
                                : "hover:z-[28] hover:ring-2 hover:ring-zinc-400/60 dark:hover:ring-zinc-500/50"
                            }`}
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                              left: `calc(${leftPct}% + ${gapPx}px)`,
                              width: `calc(${widthPct}% - ${gapPx * 2}px)`,
                              zIndex: zFinal,
                            }}
                            title={`${labelRange} ${s.title}`}
                            onDragStart={(e) => {
                              if (!canShift) return;
                              const mode = e.ctrlKey || e.metaKey ? "copy" : "move";
                              e.dataTransfer.setData("calendar/scheduleId", s.id);
                              e.dataTransfer.setData("calendar/mode", mode);
                              e.dataTransfer.setData("calendar/isAllDay", "0");
                              e.dataTransfer.effectAllowed = mode === "copy" ? "copy" : "move";
                              const sp = getScheduleSpanMs(s);
                              scheduleDragDurationMsRef.current = sp
                                ? sp.endMs - sp.startMs
                                : 0;
                            }}
                            onDragEnd={() => {
                              scheduleDragDurationMsRef.current = 0;
                              setScheduleDragPreview(null);
                            }}
                            onClick={
                              permissions.canEditSchedule
                                ? (e) => {
                                    e.stopPropagation();
                                    setSelectedDate(day.date);
                                    setSelectedScheduleId(s.id);
                                    // 予定を1クリックで編集モーダルへ（プレビューは表示しない）
                                    setIsDayEditModalOpen(true);
                                    setWeekSchedulePreviewOpen(false);
                                    setModalTab("schedule");
                                    setScheduleCreatePrefill(null);
                                    setScheduleCreateSelection(null);
                                    void weekTimeGridRef.current?.focus();
                                  }
                                : undefined
                            }
                            onPointerDown={(e) => {
                              if ((e.target as HTMLElement | null)?.closest?.("[data-resize-handle]"))
                                return;
                              e.stopPropagation();
                            }}
                          >
                            {canResize ? (
                              <button
                                type="button"
                                data-resize-handle="1"
                                draggable={false}
                                className="absolute left-0 right-0 top-0 z-10 h-1 cursor-ns-resize border-0 bg-transparent p-0 after:absolute after:-top-2 after:left-0 after:right-0 after:h-8 after:content-['']"
                                aria-label="開始時刻を変更"
                                onPointerDown={runResize("start")}
                              />
                            ) : null}
                            <div className="flex items-center gap-1 px-1 py-0.5 pt-1.5">
                              <span className="shrink-0 tabular-nums">{labelRange}</span>
                              <span className="min-w-0 truncate">{s.title}</span>
                            </div>
                            {canResize ? (
                              <button
                                type="button"
                                data-resize-handle="1"
                                draggable={false}
                                className="absolute bottom-0 left-0 right-0 z-10 h-1 cursor-ns-resize border-0 bg-transparent p-0 after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-8 after:content-['']"
                                aria-label="終了時刻を変更"
                                onPointerDown={runResize("end")}
                              />
                            ) : null}
                          </div>
                        );

                        return (
                          <Fragment key={s.id}>
                            {permissions.canEditSchedule ? (
                              <WeekScheduleBlockPopover
                                opened={
                                  selectedScheduleId === s.id && weekSchedulePreviewOpen
                                }
                                onOpenChange={(open) => {
                                  if (!open) setWeekSchedulePreviewOpen(false);
                                }}
                                schedule={s}
                                timeLabel={labelRange}
                                memoPreview={
                                  s.memo?.trim() ? s.memo.trim().slice(0, 120) : null
                                }
                                canDelete={!!deleteScheduleAction}
                                onEdit={() => {
                                  setWeekSchedulePreviewOpen(false);
                                  setIsDayEditModalOpen(true);
                                  setModalTab("schedule");
                                  setScheduleCreatePrefill(null);
                                }}
                                onDelete={async () => {
                                  if (!deleteScheduleAction) return;
                                  try {
                                    await deleteScheduleAction(s.id);
                                    setWeekSchedulePreviewOpen(false);
                                    setSelectedScheduleId(null);
                                    showToast("削除しました");
                                    void mutateRange();
                                  } catch {
                                    showToast("削除に失敗しました");
                                  }
                                }}
                              >
                                {timedInner}
                              </WeekScheduleBlockPopover>
                            ) : (
                              timedInner
                            )}
                          </Fragment>
                        );
                      });
                    })()}
                  </div>
                </div>
                  </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
