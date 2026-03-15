"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import Link from "next/link";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { getRankBarDashedLineClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { getEventColorClasses } from "@/lib/event-colors";
import { useViewMode } from "@/lib/view-mode-context";
import { ScheduleForm } from "./ScheduleForm";

dayjs.locale("ja");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 目標 vs 実績で達成バッジ（フラット・絵文字なし）。未来日は点線枠で「予定」を示す。 */
function getAchievementBadge(
  target: number | null | undefined,
  actual: number | null | undefined,
  isFuture?: boolean
): { type: "achieved" | "not_achieved" | "neutral"; label: string; className: string } {
  const t = target ?? null;
  const a = actual ?? null;
  const futureBorder = isFuture
    ? " border border-dashed border-zinc-400 dark:border-zinc-500"
    : "";
  if (t === null && a === null)
    return {
      type: "neutral",
      label: "—",
      className:
        "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400" +
        futureBorder,
    };
  if (t === null)
    return {
      type: "neutral",
      label: `+${a}`,
      className:
        "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" +
        futureBorder,
    };
  const actualVal = a ?? 0;
  if (actualVal >= t)
    return {
      type: "achieved",
      label: `+${actualVal}`,
      className:
        "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    };
  return {
    type: "not_achieved",
    label: `+${actualVal}`,
    className:
      "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-700/60 dark:text-zinc-400" +
      futureBorder,
  };
}

/** 目標と実績を並べて表示する用（目標ラベル＋実績ラベル、実績は達成/未達で色分け） */
function getTargetActualDisplay(
  target: number | null | undefined,
  actual: number | null | undefined,
  isFuture?: boolean
): { targetLabel: string; targetClass: string; actualLabel: string; actualClass: string } {
  const t = target ?? null;
  const a = actual ?? null;
  const futureBorder = isFuture
    ? " border border-dashed border-zinc-400 dark:border-zinc-500"
    : "";
  const neutralClass =
    "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300" +
    futureBorder;
  if (t === null && a === null) {
    return {
      targetLabel: "—",
      targetClass: "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400" + futureBorder,
      actualLabel: "—",
      actualClass: neutralClass,
    };
  }
  const targetLabel = t !== null ? `+${t}` : "—";
  const actualVal = a ?? 0;
  const actualLabel = t !== null ? `+${actualVal}` : (a !== null ? `+${a}` : "—");
  const achievedClass =
    "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200";
  const notAchievedClass =
    "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-700/60 dark:text-zinc-400" + futureBorder;
  const actualClass =
    t === null ? neutralClass : (actualVal >= (t ?? 0) ? achievedClass : notAchievedClass);
  return {
    targetLabel,
    targetClass: t !== null ? neutralClass : "rounded-full bg-zinc-100/80 px-1.5 py-0.5 text-[9px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
    actualLabel,
    actualClass,
  };
}

/** スキップ日: 薄い緑（休み・集計外。達成バッジの緑と区別するため teal 系） */
const SKIP_STRIPE_CLASS = "bg-teal-50 dark:bg-teal-950/60";

type DayData = {
  date: string; // YYYY-MM-DD
  isToday: boolean;
  isCurrentMonth: boolean;
  weekday: number; // 0=Sun
  holidayName: string | null;
  entries: ScheduleEntryRow[];
};

type RankCycleBand = {
  cycle_start_date: string;
  cycle_end_date: string;
  rank_during: string | null;
  /** 過去周期の合計（スキップ除く）。ゴール表示用。 */
  cycle_total?: number | null;
};

type Props = {
  calendarName: string;
  monthLabel: string;
  /** 表示中の月 YYYY-MM */
  currentMonthParam: string;
  /** 週表示で使う週の開始日（日曜）YYYY-MM-DD */
  currentWeekStart: string;
  calendarId: string;
  days: DayData[];
  permissions: CalendarPermissionFlags;
  moveEntry: (calendarId: string, fromDate: string, toDate: string) => Promise<void>;
  saveAction: (formData: FormData) => void;
  /** イベント一覧（start_date/end_date があればその日にブロック表示。color で帯の色を指定） */
  events: { id: string; name: string; start_date?: string | null; end_date?: string | null; color?: string | null }[];
  /** 現在のランク周期（帯表示・canViewRank 時のみ） */
  currentRankCycle?: { start: string; end: string; rank: string | null } | null;
  /** 過去のランク周期履歴（帯表示用） */
  rankCycleHistory?: RankCycleBand[];
  /** 目標達成時の予測ラベル（例: 目標達成で → A2） */
  forecastLabel?: string | null;
  /** 予測の未来ランク周期（点線で表示）。毎周期の見込みで連鎖計算した配列。 */
  futureCycles?: { start: string; end: string; rank: string }[];
  /** 今日の日付 YYYY-MM-DD（期間の過去/現在/未来判定用）。省略時はクライアントの今日。 */
  todayJst?: string | null;
  /** スキパ残り枚数。編集モーダルの「スキップパスを使用する(残りn枚)」表示用。 */
  skipPassRemaining?: number;
};

/** 日付が周期範囲内か判定 */
function dateInCycle(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** 指定日が含まれるイベントを返す（start_date/end_date を保持して初日・最終日判定に使う） */
function getEventsOnDate(
  events: { id: string; name: string; start_date?: string | null; end_date?: string | null; color?: string | null }[],
  date: string
): { id: string; name: string; start_date?: string | null; end_date?: string | null; color?: string | null }[] {
  return events.filter((ev) => {
    const start = ev.start_date ?? ev.end_date;
    const end = ev.end_date ?? ev.start_date;
    if (start == null || end == null) return false;
    return start <= date && date <= end;
  });
}

/** 周期の種別（過去/現在/未来） */
type PeriodType = "past" | "current" | "future";

function getPeriodType(
  cycleStart: string,
  cycleEnd: string,
  today: string
): PeriodType {
  if (cycleEnd < today) return "past";
  if (cycleStart <= today && today <= cycleEnd) return "current";
  return "future";
}

export function CalendarWithModal({
  calendarName,
  monthLabel,
  currentMonthParam,
  currentWeekStart,
  calendarId,
  days,
  permissions,
  moveEntry,
  saveAction,
  events,
  currentRankCycle = null,
  rankCycleHistory = [],
  forecastLabel = null,
  futureCycles = [],
  todayJst,
  skipPassRemaining,
}: Props) {
  const { viewMode, setViewMode } = useViewMode();
  const useSimpleView = !permissions.isOwner && viewMode === "simple";
  const todayStr = todayJst ?? dayjs().format("YYYY-MM-DD");

  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const selectedDay = selectedDate
    ? days.find((d) => d.date === selectedDate) ?? null
    : null;

  const handleSave = useCallback(
    (formData: FormData) => {
      startTransition(() => {
        Promise.resolve(saveAction(formData)).then(() => setSelectedDate(null));
      });
    },
    [saveAction]
  );

  const prevMonthParam = useMemo(() => {
    const d = dayjs(currentMonthParam, "YYYY-MM").subtract(1, "month");
    return d.format("YYYY-MM");
  }, [currentMonthParam]);
  const nextMonthParam = useMemo(() => {
    const d = dayjs(currentMonthParam, "YYYY-MM").add(1, "month");
    return d.format("YYYY-MM");
  }, [currentMonthParam]);

  const prevWeekStart = useMemo(() => {
    return dayjs(currentWeekStart).subtract(7, "day").format("YYYY-MM-DD");
  }, [currentWeekStart]);
  const nextWeekStart = useMemo(() => {
    return dayjs(currentWeekStart).add(7, "day").format("YYYY-MM-DD");
  }, [currentWeekStart]);
  const prevWeekMonth = useMemo(() => dayjs(prevWeekStart).format("YYYY-MM"), [prevWeekStart]);
  const nextWeekMonth = useMemo(() => dayjs(nextWeekStart).format("YYYY-MM"), [nextWeekStart]);

  const weekDays = useMemo(() => {
    const start = dayjs(currentWeekStart);
    const end = start.add(6, "day");
    return days.filter((d) => {
      const t = dayjs(d.date);
      return (t.isSame(start) || t.isAfter(start)) && (t.isSame(end) || t.isBefore(end));
    });
  }, [days, currentWeekStart]);

  /** この日付が属する周期（現在 > 履歴 > 予測）と周期種別・予測フラグ */
  const getCycleForDate = useCallback(
    (date: string): { start: string; end: string; rank: string | null; isCurrent: boolean; cycleTotal?: number | null; periodType: PeriodType; isPredicted?: boolean } | null => {
      if (!permissions.canViewRank) return null;
      if (currentRankCycle && dateInCycle(date, currentRankCycle.start, currentRankCycle.end)) {
        return {
          start: currentRankCycle.start,
          end: currentRankCycle.end,
          rank: currentRankCycle.rank,
          isCurrent: true,
          periodType: getPeriodType(currentRankCycle.start, currentRankCycle.end, todayStr),
        };
      }
      for (const h of rankCycleHistory) {
        if (dateInCycle(date, h.cycle_start_date, h.cycle_end_date)) {
          return {
            start: h.cycle_start_date,
            end: h.cycle_end_date,
            rank: h.rank_during,
            isCurrent: false,
            cycleTotal: h.cycle_total ?? null,
            periodType: getPeriodType(h.cycle_start_date, h.cycle_end_date, todayStr),
          };
        }
      }
      for (const fc of futureCycles) {
        if (dateInCycle(date, fc.start, fc.end)) {
          return {
            start: fc.start,
            end: fc.end,
            rank: fc.rank,
            isCurrent: false,
            periodType: "future",
            isPredicted: true,
          };
        }
      }
      return null;
    },
    [permissions.canViewRank, currentRankCycle, rankCycleHistory, futureCycles, todayStr]
  );

  /** 週行内でバーの角丸: 左端セルで左丸、右端セルで右丸 */
  const getBarRoundedInRow = useCallback(
    (date: string, rowDates: string[], cycleStart: string, cycleEnd: string): { roundedLeft: boolean; roundedRight: boolean } => {
      const inRange = rowDates.filter((d) => dateInCycle(d, cycleStart, cycleEnd));
      if (inRange.length === 0) return { roundedLeft: false, roundedRight: false };
      const firstInRow = inRange[0];
      const lastInRow = inRange[inRange.length - 1];
      return {
        roundedLeft: date === firstInRow,
        roundedRight: date === lastInRow,
      };
    },
    []
  );

  /** 周期帯の表示用ラベル（ランク＋日付範囲） */
  const formatCycleBandLabel = (rank: string | null, cycleStart?: string, cycleEnd?: string) => {
    const r = rank ?? "—";
    if (cycleStart && cycleEnd) {
      const s = dayjs(cycleStart).format("M/D");
      const e = dayjs(cycleEnd).format("M/D");
      return `${r} ${s}〜${e}`;
    }
    return r;
  };

  /** 期間種別ごとのセル背景（ランク周期に属する日のみ） */
  const getPeriodCellClass = useCallback((periodType: PeriodType, isToday: boolean): string => {
    if (isToday && periodType === "current")
      return "bg-accent-50 dark:bg-accent-950/40";
    switch (periodType) {
      case "past":
        return "bg-zinc-100 dark:bg-zinc-800/90";
      case "current":
        return "bg-white dark:bg-zinc-900";
      case "future":
        return "bg-zinc-50/70 dark:bg-zinc-900/70 border border-dashed border-zinc-300 dark:border-zinc-600";
      default:
        return "bg-white dark:bg-zinc-900";
    }
  }, []);

  const monthWeeks = useMemo(() => {
    const chunks: DayData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [days]);

  const renderMonthGrid = () => (
    <section className="flex min-h-[calc(100vh-220px)] flex-col rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {WEEKDAYS.map((label, idx) => {
          const isSun = idx === 0;
          const isSat = idx === 6;
          const base =
            "py-1 text-center font-medium tracking-tight bg-zinc-50 dark:bg-zinc-900";
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
                const bg =
                  cycle
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
                const eventsOnDay = permissions.canViewEvents ? getEventsOnDate(events, day.date) : [];
                const showBordersInCell = permissions.canViewBorders && viewMode === "detailed";

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      if (permissions.canEditSchedule) setSelectedDate(day.date);
                    }}
                    onDragOver={(e) => {
                      if (canDrop) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!canDrop || !permissions.isOwner) return;
                      const fromDate = e.dataTransfer.getData("text/plain");
                      if (!fromDate || fromDate === day.date) return;
                      startTransition(() => void moveEntry(calendarId, fromDate, day.date));
                    }}
                    style={{ gridColumn: dayIdx + 1 }}
                    className={`${isSkip ? SKIP_STRIPE_CLASS : bg} relative flex min-h-0 flex-col border p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${day.isToday ? "border-2 border-accent-500 ring-2 ring-accent-500/30 dark:border-accent-400 dark:ring-accent-400/30" : "border-zinc-200/80 dark:border-zinc-800/80"}`}
                  >
                    {cycle && permissions.canViewRank && (() => {
                      const showBracket = !isSkip;
                      const isPhaseStart = day.date === cycle.start;
                      const isPhaseEnd = day.date === cycle.end;
                      const vertStrong = !!((rounded?.roundedLeft && isPhaseStart) || (rounded?.roundedRight && isPhaseEnd));
                      const vertClass = getRankBarVerticalBorderClass(cycle.rank, vertStrong);
                      return (
                        <div
                          className={`mt-0.5 flex items-center gap-0.5 overflow-visible ${showBracket && rounded?.roundedLeft ? "rounded-tl-sm border-l-2 " + vertClass : ""} ${showBracket && rounded?.roundedRight ? "rounded-tr-sm border-r-2 " + vertClass : ""}`}
                          title={formatCycleBandLabel(cycle.rank, cycle.start, cycle.end) + (cycle.isPredicted ? "（予測）" : "")}
                        >
                          {cycle.isPredicted ? (
                            <div className={`min-w-0 flex-1 h-0 ${getRankBarDashedLineClass(cycle.rank)}`} />
                          ) : (
                            <div className={`h-1 min-w-0 flex-1 ${getRankBarLineClass(cycle.rank)}`} />
                          )}
                          <span className={`shrink-0 text-[8px] font-medium ${getRankBarTextClass(cycle.rank)}`}>
                            {cycle.rank ?? "—"}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex flex-1 flex-col p-1">
                      <div className="flex items-center justify-between gap-0.5">
                        <span className={`flex items-center gap-0.5 text-[11px] font-medium ${textColor}`}>
                          {dateObj.date()}
                          {showEventIcon && <span className="text-[10px]" title="イベント">🎉</span>}
                          {showMemoIcon && <span className="text-[10px]" title="メモ">📝</span>}
                        </span>
                        {day.isToday && (
                          <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[9px] font-medium text-white shrink-0">
                            今日
                          </span>
                        )}
                      </div>
                      {day.holidayName && !isSkip && (
                        <span className="mt-0.5 line-clamp-1 text-[9px] text-red-500">
                          {day.holidayName}
                        </span>
                      )}
                      {eventsOnDay.length > 0 && (
                        <div className="mt-0.5 flex flex-col gap-px -mx-1.5 shrink-0">
                          {eventsOnDay.map((ev) => {
                            const isStart = ev.start_date != null && ev.start_date === day.date;
                            const isEnd = ev.end_date != null && ev.end_date === day.date;
                            const { border, bg, text } = getEventColorClasses(ev.color ?? null);
                            return (
                              <div
                                key={ev.id}
                                className={`${bg} py-px text-[10px] font-medium line-clamp-1 ${text} ${isStart ? "rounded-l border-l-4 pl-1 " + border : "pl-0.5"} ${isEnd ? "rounded-r" : ""}`}
                                title={ev.name}
                              >
                                {isStart ? ev.name : "\u00A0"}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isSkip ? (
                        <div className="mt-1 flex flex-1 items-center justify-center min-h-0">
                          <span className="text-[8px] font-medium text-teal-600/80 dark:text-teal-400/80" title="スキパ使用日">
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
                          +2:{entry.border_plus2 ?? "-"} +4:{entry.border_plus4 ?? "-"} +6:{entry.border_plus6 ?? "-"}
                        </p>
                      )}
                      {isCycleEnd && permissions.canViewRank && !cycle.isPredicted && cycle.periodType === "past" && cycle.cycleTotal != null && (
                        <p className="mt-0.5 text-[7px] text-zinc-400 dark:text-zinc-500" title="周期の最終合計">
                          🏁 +{cycle.cycleTotal}
                        </p>
                      )}
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

  const renderWeekGrid = () => (
    <section className="flex min-h-[calc(100vh-220px)] flex-col rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {WEEKDAYS.map((label, idx) => {
          const isSun = idx === 0;
          const isSat = idx === 6;
          const base =
            "py-1 text-center font-medium tracking-tight bg-zinc-50 dark:bg-zinc-900";
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

      <div className="mt-1 grid min-h-0 flex-1 grid-cols-7 grid-rows-[1fr] gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {weekDays.map((day) => {
          const dateObj = dayjs(day.date);
          const entry = day.entries[0];
          const cycle = getCycleForDate(day.date);
          const weekRowDates = weekDays.map((d) => d.date);
          const rounded = cycle
            ? getBarRoundedInRow(day.date, weekRowDates, cycle.start, cycle.end)
            : null;
          const bg =
            cycle
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

          const isSkip = entry?.skip_pass_used ?? false;
          const canDrop =
            permissions.isOwner && (!entry || !entry.skip_pass_used);
          const showEventIcon = permissions.canViewEvents && entry?.event_id;
          const showMemoIcon = permissions.canViewMemo && entry?.memo?.trim();
          const eventsOnDay = permissions.canViewEvents ? getEventsOnDate(events, day.date) : [];

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                if (permissions.canEditSchedule) {
                  setSelectedDate(day.date);
                }
              }}
              onDragOver={(e) => {
                if (canDrop) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!canDrop || !permissions.isOwner) return;
                const fromDate = e.dataTransfer.getData("text/plain");
                if (!fromDate || fromDate === day.date) return;
                startTransition(() => {
                  void moveEntry(calendarId, fromDate, day.date);
                });
              }}
              className={`${isSkip ? SKIP_STRIPE_CLASS : bg} relative flex min-h-[120px] flex-col border p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${day.isToday ? "border-2 border-accent-500 ring-2 ring-accent-500/30 dark:border-accent-400 dark:ring-accent-400/30" : "border-zinc-200/80 dark:border-zinc-800/80"}`}
            >
              {cycle && permissions.canViewRank && (() => {
                const showBracket = !isSkip;
                const isPhaseStart = day.date === cycle.start;
                const isPhaseEnd = day.date === cycle.end;
                const vertStrong = !!((rounded?.roundedLeft && isPhaseStart) || (rounded?.roundedRight && isPhaseEnd));
                const vertClass = getRankBarVerticalBorderClass(cycle.rank, vertStrong);
                return (
                  <div
                    className={`flex items-center gap-0.5 overflow-visible ${showBracket && rounded?.roundedLeft ? "rounded-tl-sm border-l-2 " + vertClass : ""} ${showBracket && rounded?.roundedRight ? "rounded-tr-sm border-r-2 " + vertClass : ""}`}
                    title={formatCycleBandLabel(cycle.rank, cycle.start, cycle.end) + (cycle.isPredicted ? "（予測）" : "")}
                  >
                    {cycle.isPredicted ? (
<div className={`min-w-0 flex-1 h-0 ${getRankBarDashedLineClass(cycle.rank)}`} />
                      ) : (
                        <div className={`h-1 min-w-0 flex-1 ${getRankBarLineClass(cycle.rank)}`} />
                      )}
                    <span className={`shrink-0 text-[9px] font-medium ${getRankBarTextClass(cycle.rank)}`}>
                      {cycle.rank ?? "—"}
                    </span>
                  </div>
                );
              })()}
              <div className="flex flex-1 flex-col p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={`text-[12px] font-semibold ${textColor}`}>
                    {dateObj.format("D日")}
                  </span>
                  {showEventIcon && (
                    <span className="text-[11px]" title="イベント">
                      🎉
                    </span>
                  )}
                  {showMemoIcon && (
                    <span className="text-[11px]" title="メモ">
                      📝
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    ({WEEKDAYS[day.weekday]})
                  </span>
                </div>
                {day.isToday && (
                  <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-medium text-white shrink-0">
                    今日
                  </span>
                )}
              </div>

              {day.holidayName && !isSkip && (
                <p className="mt-0.5 text-[10px] text-red-500">{day.holidayName}</p>
              )}

              {eventsOnDay.length > 0 && (
                <div className="mt-1 flex flex-col gap-px -mx-1.5 shrink-0">
{eventsOnDay.map((ev) => {
                        const isStart = ev.start_date != null && ev.start_date === day.date;
                        const isEnd = ev.end_date != null && ev.end_date === day.date;
                        const { border, bg, text } = getEventColorClasses(ev.color ?? null);
                        return (
                          <div
                            key={ev.id}
                            className={`${bg} py-0.5 text-[10px] font-medium line-clamp-1 ${text} ${isStart ? "rounded-l border-l-4 pl-2 " + border : "pl-0.5"} ${isEnd ? "rounded-r" : ""}`}
                            title={ev.name}
                          >
                            {isStart ? ev.name : "\u00A0"}
                          </div>
                        );
                      })}
                </div>
              )}

              {isSkip ? (
                <div className="mt-4 flex flex-1 items-center justify-center min-h-0">
                  <span className="text-[11px] font-medium text-teal-600/80 dark:text-teal-400/80" title="スキパ使用日">
                    スキパ
                  </span>
                </div>
              ) : entry ? (
                <div className="mt-2 space-y-1 text-[11px] text-zinc-700 dark:text-zinc-200">
                  {permissions.canViewTargetActual && (() => {
                    const disp = getTargetActualDisplay(entry.target_plus, entry.actual_plus, day.date > todayStr);
                    return (
                      <p className="flex flex-wrap items-center gap-1">
                        <span className={disp.targetClass} title="目標">{disp.targetLabel}</span>
                        <span className="text-zinc-400">/</span>
                        <span className={disp.actualClass} title="実績">{disp.actualLabel}</span>
                      </p>
                    );
                  })()}
                  {permissions.canViewTargetActual === false && (
                    <p className="text-[10px] text-zinc-500">非公開</p>
                  )}
                  {viewMode === "detailed" && permissions.canViewBorders && (
                    <p className="text-[10px]">
                      +2: {entry.border_plus2 ?? "-"} / +4: {entry.border_plus4 ?? "-"} / +6:{" "}
                      {entry.border_plus6 ?? "-"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-[10px] text-zinc-400 dark:text-zinc-600">
                  この週のこの日はまだ登録がありません。
                </p>
              )}
              {isCycleEnd && permissions.canViewRank && !cycle.isPredicted && cycle.periodType === "past" && cycle.cycleTotal != null && (
                <p className="mt-1 text-[9px] text-zinc-400 dark:text-zinc-500" title="周期の最終合計">
                  🏁 +{cycle.cycleTotal}
                </p>
              )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            カレンダー
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {calendarName} の {monthLabel}
            のスケジュールを表示しています。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-0.5 text-zinc-700 dark:text-zinc-200">
            {view === "month" ? (
              <>
                <Link
                  href={`/dashboard/calendar?month=${prevMonthParam}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="前月"
                >
                  ‹
                </Link>
                <Link
                  href={`/dashboard/calendar?month=${nextMonthParam}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="次月"
                >
                  ›
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/dashboard/calendar?month=${prevWeekMonth}&week=${prevWeekStart}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="前週"
                >
                  ‹
                </Link>
                <Link
                  href={`/dashboard/calendar?month=${nextWeekMonth}&week=${nextWeekStart}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="次週"
                >
                  ›
                </Link>
              </>
            )}
          </nav>
          <div className="hidden items-center gap-1 rounded-full bg-zinc-100 p-1 text-[11px] text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300 md:flex">
          <button
            type="button"
            onClick={() => setView("month")}
            className={`rounded-full px-3 py-1 ${
              view === "month"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : ""
            }`}
          >
            月
          </button>
          <button
            type="button"
            onClick={() => setView("week")}
            className={`rounded-full px-3 py-1 ${
              view === "week"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : ""
            }`}
            >
            週
          </button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-0.5 text-[10px] dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode("simple")}
              className={`rounded-full px-2 py-1 font-medium ${
                viewMode === "simple"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title="目標・実績・イベントのみ表示"
            >
              簡易
            </button>
            <button
              type="button"
              onClick={() => setViewMode("detailed")}
              className={`rounded-full px-2 py-1 font-medium ${
                viewMode === "detailed"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title="ボーダー（+2/+4/+6）も表示"
            >
              詳細
            </button>
          </div>
        </div>
      </header>

      {view === "week" ? renderWeekGrid() : renderMonthGrid()}

      {isPending && (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          日付を移動中です…
        </p>
      )}

      {permissions.canEditSchedule && selectedDate && selectedDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  日別スケジュールの編集
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {dayjs(selectedDate).format("YYYY年 M月D日 (ddd)")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                閉じる
              </button>
            </div>

            <ScheduleForm
              calendarId={calendarId}
              defaultDate={selectedDate}
              action={handleSave}
              events={events}
              defaultTargetPlus={selectedDay?.entries[0]?.target_plus}
              defaultActualPlus={selectedDay?.entries[0]?.actual_plus}
              defaultSkipPassUsed={selectedDay?.entries[0]?.skip_pass_used}
              skipPassRemaining={skipPassRemaining}
            />
          </div>
        </div>
      )}
    </div>
  );
}

