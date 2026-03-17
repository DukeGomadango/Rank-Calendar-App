"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import Link from "next/link";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { useToast } from "@/lib/toast-context";
import { getRankBarDashedLineColorClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { EVENT_PALETTE, getEventColorClasses, getEventColorDotClass } from "@/lib/event-colors";
import { toJstDateString } from "@/lib/domain/calendar";
import { useViewMode } from "@/lib/view-mode-context";
import { ScheduleForm } from "./ScheduleForm";
import { DayDetailModal, type DayDetailRow } from "@/components/data/DayDetailModal";

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
  events: EventRow[];
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
  /** 時間付きの予定（新テーブル calendar_schedules 由来） */
  schedules?: CalendarScheduleRow[];
  /** 時間付き予定の保存用 Server Action */
  saveScheduleAction?: (formData: FormData) => Promise<
    | { ok: true }
    | { ok: false; errors: Record<string, string[]> }
    | void
  >;
  /** 時間付き予定の削除用 Server Action */
  deleteScheduleAction?: (scheduleId: string) => Promise<void>;
};

/** 日付が周期範囲内か判定 */
function dateInCycle(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** 指定日が含まれるイベントを返す（start_date/end_date を保持して初日・最終日判定に使う） */
function getEventsOnDate(
  events: EventRow[],
  date: string
): EventRow[] {
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
  schedules = [],
  saveScheduleAction,
  deleteScheduleAction,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { viewMode, setViewMode } = useViewMode();
  const useSimpleView = !permissions.isOwner && viewMode === "simple";
  const todayStr = todayJst ?? toJstDateString(new Date());

  const [localDays, setLocalDays] = useState<DayData[]>(days);
  const [moveError, setMoveError] = useState<string | null>(null);
  const prevLocalDaysRef = useRef<DayData[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  /** モバイルでボトムシートを下からせり上がらせる用。開いた直後に true にして transition をかける */
  const [sheetEntered, setSheetEntered] = useState(false);

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  useEffect(() => {
    if (!selectedDate) {
      setSheetEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDate(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDate]);

  const selectedDay = selectedDate
    ? localDays.find((d) => d.date === selectedDate) ?? null
    : null;

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, CalendarScheduleRow[]>();
    for (const s of schedules) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    // 各日の中で、終日→開始時刻順の順に並べる
    for (const [key, list] of map) {
      list.sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        const as = a.start_time ?? "";
        const bs = b.start_time ?? "";
        return as.localeCompare(bs);
      });
      map.set(key, list);
    }
    return map;
  }, [schedules]);

  const selectedSchedules = selectedDate
    ? schedulesByDate.get(selectedDate) ?? []
    : [];

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"rank" | "schedule">("rank");

  const selectedSchedule =
    selectedScheduleId && selectedDate
      ? (schedulesByDate.get(selectedDate) ?? []).find((s) => s.id === selectedScheduleId) ?? null
      : null;

  /** 参加イベントの初期値。スケジュールに event_id が無くても、その日をまたぐイベントが1件だけならそれを選ぶ */
  const effectiveDefaultEventId =
    selectedDay?.entries[0]?.event_id ??
    (selectedDate && (() => {
      const onDay = getEventsOnDate(events, selectedDate);
      return onDay.length === 1 ? onDay[0].id : undefined;
    })());

  const handleSave = useCallback(
    (formData: FormData) => {
      const date = (formData.get("date") as string | null) ?? null;
      if (!date) {
        showToast("日付が不正です");
        return;
      }

      prevLocalDaysRef.current = localDays;
      setLocalDays((prev) =>
        prev.map((day) => {
          if (day.date !== date) return day;

          const existing = day.entries[0] ?? null;
          const parseNumber = (name: string): number | null => {
            const raw = formData.get(name);
            if (raw == null) return null;
            const s = String(raw).trim();
            if (!s) return null;
            const n = Number(s);
            return Number.isNaN(n) ? null : n;
          };

          const skipPassUsed = formData.get("skip_pass_used") === "on";
          const targetPlus = parseNumber("target_plus");
          const actualPlus = parseNumber("actual_plus");
          const ansukoBaseline = parseNumber("ansuko_baseline");
          const borderPlus2 = parseNumber("border_plus2");
          const borderPlus4 = parseNumber("border_plus4");
          const borderPlus6 = parseNumber("border_plus6");
          const eventIdRaw = formData.get("event_id");
          const memoRaw = formData.get("memo");
          const streamContentRaw = formData.get("stream_content");
          const streamContentColorRaw = formData.get("stream_content_color");

          const nextEntry: ScheduleEntryRow = {
            id: existing?.id ?? `temp-${day.date}`,
            date,
            ansuko_baseline: ansukoBaseline,
            border_plus2: borderPlus2,
            border_plus4: borderPlus4,
            border_plus6: borderPlus6,
            event_id: eventIdRaw ? String(eventIdRaw) || null : null,
            memo: memoRaw ? (String(memoRaw).trim() || null) : null,
            target_plus: targetPlus,
            actual_plus: actualPlus,
            skip_pass_used: skipPassUsed,
            stream_content: streamContentRaw
              ? (String(streamContentRaw).trim() || null)
              : null,
            stream_content_color: streamContentColorRaw
              ? String(streamContentColorRaw) || null
              : null,
          };

          return {
            ...day,
            entries: [nextEntry],
          };
        })
      );

      setSelectedDate(null);

      Promise.resolve(saveAction(formData))
        .then(() => {
          showToast("保存しました");
        })
        .catch(() => {
          if (prevLocalDaysRef.current) {
            setLocalDays(prevLocalDaysRef.current);
          }
          prevLocalDaysRef.current = null;
          showToast("保存に失敗しました");
        });
    },
    [localDays, saveAction, showToast]
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

  const [isNavigating, setIsNavigating] = useState(false);

  const goToMonth = useCallback(
    (month: string) => {
      setIsNavigating(true);
      router.push(`/dashboard/calendar?month=${month}`);
    },
    [router]
  );

  const goToWeek = useCallback(
    (month: string, weekStart: string) => {
      setIsNavigating(true);
      router.push(`/dashboard/calendar?month=${month}&week=${weekStart}`);
    },
    [router]
  );

  const weekDays = useMemo(() => {
    const start = dayjs(currentWeekStart);
    const end = start.add(6, "day");
    return localDays.filter((d) => {
      const t = dayjs(d.date);
      return (t.isSame(start) || t.isAfter(start)) && (t.isSame(end) || t.isBefore(end));
    });
  }, [localDays, currentWeekStart]);

  const handleMoveEntry = useCallback(
    (fromDate: string, toDate: string) => {
      if (fromDate === toDate) return;
      setMoveError(null);
      prevLocalDaysRef.current = localDays;
      setLocalDays((prev) => {
        const fromIdx = prev.findIndex((d) => d.date === fromDate);
        const toIdx = prev.findIndex((d) => d.date === toDate);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const fromDay = prev[fromIdx];
        const toDay = prev[toIdx];
        const entry = fromDay.entries[0];
        if (!entry) return prev;
        const next = prev.map((d, i) => {
          if (i === fromIdx)
            return { ...fromDay, entries: [] };
          if (i === toIdx)
            return { ...toDay, entries: [entry] };
          return d;
        });
        return next;
      });
      moveEntry(calendarId, fromDate, toDate)
        .then(() => {
          showToast("日付を移動しました");
        })
        .catch((err: { message?: string }) => {
          if (prevLocalDaysRef.current) setLocalDays(prevLocalDaysRef.current);
          prevLocalDaysRef.current = null;
          setMoveError(err?.message ?? "移動に失敗しました");
        });
    },
    [calendarId, localDays, moveEntry, router, showToast]
  );

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

  /** リスナー用詳細モーダルに渡す DayDetailRow。selectedDay とランク周期（現在・履歴・予測）から組み立てる。 */
  const detailRowForModal: DayDetailRow | null = useMemo(() => {
    if (!selectedDay || !selectedDate) return null;
    const entry = selectedDay.entries[0];
    const cycle = getCycleForDate(selectedDay.date);
    const currentRank = cycle?.rank ?? null;
    return {
      date: selectedDay.date,
      weekday: WEEKDAYS[dayjs(selectedDay.date).day()],
      current_rank: currentRank,
      rank_score_cumulative: null,
      ...(entry && {
        id: entry.id,
        ansuko_baseline: entry.ansuko_baseline,
        border_plus2: entry.border_plus2,
        border_plus4: entry.border_plus4,
        border_plus6: entry.border_plus6,
        target_plus: entry.target_plus,
        actual_plus: entry.actual_plus,
        skip_pass_used: entry.skip_pass_used,
        memo: entry.memo,
        event_id: entry.event_id,
        stream_content: entry.stream_content,
        stream_content_color: entry.stream_content_color,
      }),
    };
  }, [selectedDay, selectedDate, getCycleForDate]);

  type DayScheduleActionResult =
    | { ok: true }
    | { ok: false; errors: Record<string, string[]> };

  function DayScheduleForm({
    calendarId,
    date,
    initialSchedule,
  }: {
    calendarId: string;
    date: string;
    initialSchedule?: CalendarScheduleRow | null;
  }) {
    const idPrefix = useId();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const { pending } = useFormStatus();
    const loading = pending || isSubmitting;

    const getError = (name: string) => fieldErrors[name]?.[0];
    const inputErrorClass =
      "border-amber-500 focus:border-amber-500 focus:ring-amber-300 dark:border-amber-500";
    const inputBaseClass =
      "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!saveScheduleAction) return;
      if (isSubmitting) return;
      setFieldErrors({});
      setIsSubmitting(true);
      try {
        const result = (await saveScheduleAction(
          new FormData(e.currentTarget)
        )) as DayScheduleActionResult | void;
        if (result && "ok" in result && !result.ok) {
          setFieldErrors(result.errors);
        } else if (result && "ok" in result && result.ok) {
          (e.target as HTMLFormElement).reset();
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const scrollFocusedIntoView = (e: React.FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        onFocusCapture={scrollFocusedIntoView}
        className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 text-[11px] dark:border-slate-600 dark:bg-slate-900/60"
      >
        <input type="hidden" name="calendar_id" value={calendarId} />
        <input type="hidden" name="date" value={date} />
        {initialSchedule && <input type="hidden" name="id" value={initialSchedule.id} />}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">予定の入力内容を確認してください</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-title`} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
              タイトル
            </span>
            <input
              id={`${idPrefix}-title`}
              name="title"
              type="text"
              placeholder="歌枠・雑談・予定名など"
              defaultValue={initialSchedule?.title ?? ""}
              aria-invalid={!!getError("title")}
              className={getError("title") ? `${inputBaseClass} ${inputErrorClass}` : inputBaseClass}
            />
            {getError("title") && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400" role="alert">
                {getError("title")}
              </span>
            )}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              name="is_all_day"
              defaultChecked={initialSchedule?.is_all_day ?? false}
              className="h-3 w-3 rounded border-zinc-300 text-accent-500 focus:ring-accent-400 dark:border-zinc-600"
            />
            <span className="text-[10px] text-zinc-600 dark:text-zinc-300">終日</span>
          </label>
          <div className="flex items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-400">
            <span>時間</span>
            <input
              type="time"
              name="start_time"
              className={`${inputBaseClass} h-6 w-20`}
              defaultValue={initialSchedule?.start_time ? initialSchedule.start_time.slice(0, 5) : ""}
            />
            <span>〜</span>
            <input
              type="time"
              name="end_time"
              className={`${inputBaseClass} h-6 w-20`}
              defaultValue={initialSchedule?.end_time ? initialSchedule.end_time.slice(0, 5) : ""}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">種別</span>
            <select
              name="kind"
              className={`${inputBaseClass} h-7`}
              defaultValue={initialSchedule?.kind ?? "stream"}
            >
              <option value="stream">配信</option>
              <option value="personal">個人</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">色</span>
            <div className="flex flex-wrap gap-1">
              {EVENT_PALETTE.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-0.5">
                  <input
                    type="radio"
                    name="color_id"
                    value={c.id}
                    defaultChecked={(initialSchedule?.color_id ?? "rose") === c.id}
                    className="sr-only peer"
                  />
                  <span
                    className={`block h-4 w-4 rounded border-2 border-transparent peer-checked:border-zinc-800 peer-checked:ring-1 peer-checked:ring-zinc-600 dark:peer-checked:border-zinc-200 ${c.swatch}`}
                    title={c.label}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-memo`} className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
              メモ（任意）
            </span>
            <textarea
              id={`${idPrefix}-memo`}
              name="memo"
              rows={2}
              className={inputBaseClass}
              defaultValue={initialSchedule?.memo ?? ""}
              placeholder="配信の詳細や準備メモなど"
            />
            {getError("memo") && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400" role="alert">
                {getError("memo")}
              </span>
            )}
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 focus:ring-offset-zinc-50 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
          >
            {loading ? "追加中..." : "予定を追加"}
          </button>
        </div>
      </form>
    );
  }

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
    for (let i = 0; i < localDays.length; i += 7) {
      chunks.push(localDays.slice(i, i + 7));
    }
    return chunks;
  }, [localDays]);

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
                    onClick={() => setSelectedDate(day.date)}
                    onDragOver={(e) => {
                      if (canDrop) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!canDrop || !permissions.isOwner) return;
                      const fromDate = e.dataTransfer.getData("text/plain");
                      if (!fromDate || fromDate === day.date) return;
                      handleMoveEntry(fromDate, day.date);
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
                            <div className={`min-w-0 flex-1 h-0 border-t-2 md:border-t-4 ${getRankBarDashedLineColorClass(cycle.rank)}`} />
                          ) : (
                            <div className={`h-0.5 md:h-1 min-w-0 flex-1 ${getRankBarLineClass(cycle.rank)}`} />
                          )}
                          <span className={`shrink-0 text-[7px] md:text-[8px] font-medium ${getRankBarTextClass(cycle.rank)}`}>
                            {cycle.rank ?? "—"}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex flex-1 flex-col p-1">
                      {/* モバイル月ビュー: 日付＋インジケーター（ドット）のみ */}
                      <div className="flex flex-1 flex-col md:hidden">
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
                          <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-900/40 dark:text-red-200">
                            <span className="shrink-0 text-[9px]">祝</span>
                            <span className="min-w-0 truncate">{day.holidayName}</span>
                          </span>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-0.5" aria-hidden>
                          {isSkip && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" title="スキパ" />}
                          {!isSkip && eventsOnDay.map((ev) => (
                            <span key={ev.id} className={`h-1.5 w-1.5 shrink-0 rounded-full ${getEventColorDotClass(ev.color ?? null)}`} title={ev.name} />
                          ))}
                          {!isSkip && hasEntry && (
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getEventColorDotClass(entry?.stream_content_color ?? "blue")}`} title={entry?.stream_content ?? "予定"} />
                          )}
                        </div>
                      </div>
                      {/* PC月ビュー: 従来のフル表示 */}
                      <div className="hidden md:flex flex-1 flex-col">
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
                          <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600 dark:bg-red-900/40 dark:text-red-200">
                            <span className="shrink-0 text-[9px]">祝</span>
                            <span className="min-w-0 truncate">{day.holidayName}</span>
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
                        {!isSkip && entry?.stream_content?.trim() && (() => {
                          const streamStyle = getEventColorClasses(entry.stream_content_color ?? null);
                          return (
                            <div
                              className={`mt-0.5 shrink-0 line-clamp-1 py-px pl-1 text-[9px] font-medium rounded-r ${streamStyle.leftBar} ${streamStyle.bg} ${streamStyle.text}`}
                              title={entry.stream_content}
                            >
                              {entry.stream_content.trim()}
                            </div>
                          );
                        })()}
                        {!hasEntry && !isSkip && permissions.canEditSchedule && (
                          <p className="mt-1 flex-1 text-[9px] text-zinc-400 dark:text-zinc-500 line-clamp-2">
                            ここに予定を追加
                          </p>
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
              onClick={() => setSelectedDate(day.date)}
              onDragOver={(e) => {
                if (canDrop) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!canDrop || !permissions.isOwner) return;
                const fromDate = e.dataTransfer.getData("text/plain");
                if (!fromDate || fromDate === day.date) return;
                handleMoveEntry(fromDate, day.date);
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
                      <div className={`min-w-0 flex-1 h-0 border-t-2 md:border-t-4 ${getRankBarDashedLineColorClass(cycle.rank)}`} />
                    ) : (
                      <div className={`h-0.5 md:h-1 min-w-0 flex-1 ${getRankBarLineClass(cycle.rank)}`} />
                    )}
                    <span className={`shrink-0 text-[7px] md:text-[9px] font-medium ${getRankBarTextClass(cycle.rank)}`}>
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
                <p className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/40 dark:text-red-200">
                  <span className="shrink-0 text-[9px]">祝</span>
                  <span className="min-w-0 truncate">{day.holidayName}</span>
                </p>
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

              {!isSkip && entry?.stream_content?.trim() && (() => {
                const streamStyle = getEventColorClasses(entry.stream_content_color ?? null);
                return (
                  <div
                    className={`mt-1 shrink-0 line-clamp-1 py-0.5 pl-2 text-[10px] font-medium rounded-r ${streamStyle.leftBar} ${streamStyle.bg} ${streamStyle.text}`}
                    title={entry.stream_content}
                  >
                    {entry.stream_content.trim()}
                  </div>
                );
              })()}

              {isSkip ? (
                <div className="mt-4 flex flex-1 items-center justify-center min-h-0">
                  <span className="text-[11px] font-medium text-teal-600/80 dark:text-teal-400/80" title="スキパ使用日">
                    スキパ
                  </span>
                </div>
              ) : entry ? (
                (() => {
                  const disp = getTargetActualDisplay(entry.target_plus, entry.actual_plus, day.date > todayStr);
                  return (
                <div className="mt-2 flex flex-1 flex-col gap-0.5 text-[10px] text-zinc-700 dark:text-zinc-200">
                  {permissions.canViewTargetActual && (
                    <>
                      <p className="flex justify-between gap-1">
                        <span className="shrink-0 text-zinc-500 dark:text-zinc-400">スコア目標：</span>
                        <span className={disp.targetClass}>{disp.targetLabel}</span>
                      </p>
                      <p className="flex justify-between gap-1">
                        <span className="shrink-0 text-zinc-500 dark:text-zinc-400">スコア実績：</span>
                        <span className={disp.actualClass}>{disp.actualLabel}</span>
                      </p>
                    </>
                  )}
                  {permissions.canViewTargetActual === false && (
                    <p className="text-[10px] text-zinc-500">非公開</p>
                  )}
                  {viewMode === "detailed" && permissions.canViewBorders && (
                    <p className="flex justify-between gap-1">
                      <span className="shrink-0 text-zinc-500 dark:text-zinc-400">アンスコ：</span>
                      <span>{entry.ansuko_baseline ?? "—"}</span>
                    </p>
                  )}
                  {permissions.canViewMemo && (
                    <p className="flex justify-between gap-1">
                      <span className="shrink-0 text-zinc-500 dark:text-zinc-400">メモ：</span>
                      <span className="min-w-0 truncate text-right" title={entry.memo ?? undefined}>
                        {entry.memo?.trim() || "—"}
                      </span>
                    </p>
                  )}
                  {viewMode === "detailed" && permissions.canViewBorders && (
                    <>
                      <p className="flex justify-between gap-1">
                        <span className="shrink-0 text-zinc-500 dark:text-zinc-400">＋２：</span>
                        <span>{entry.border_plus2 ?? "—"}</span>
                      </p>
                      <p className="flex justify-between gap-1">
                        <span className="shrink-0 text-zinc-500 dark:text-zinc-400">＋４：</span>
                        <span>{entry.border_plus4 ?? "—"}</span>
                      </p>
                      <p className="flex justify-between gap-1">
                        <span className="shrink-0 text-zinc-500 dark:text-zinc-400">＋６：</span>
                        <span>{entry.border_plus6 ?? "—"}</span>
                      </p>
                    </>
                  )}
                </div>
                  );
                })()
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
      {/* 縦幅を節約: md 以上（横長含む）はタイトル＋操作を1行に */}
      <header className="flex flex-wrap items-baseline justify-between gap-2 md:flex-row md:items-center md:gap-3">
        <div className="min-w-0 md:shrink-0">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            カレンダー
          </h1>
          <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {monthLabel}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {calendarName} のスケジュールを表示しています。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
          {/* 月 / 週 切り替え（PC・モバイル共通で表示） */}
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1 text-[11px] text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
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
          <nav className="flex items-center gap-0.5 text-zinc-700 dark:text-zinc-200">
            {view === "month" ? (
              <>
                <button
                  type="button"
                  onClick={() => goToMonth(prevMonthParam)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="前月"
                  disabled={isNavigating}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => goToMonth(nextMonthParam)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="次月"
                  disabled={isNavigating}
                >
                  ›
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => goToWeek(prevWeekMonth, prevWeekStart)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="前週"
                  disabled={isNavigating}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => goToWeek(nextWeekMonth, nextWeekStart)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="次週"
                  disabled={isNavigating}
                >
                  ›
                </button>
              </>
            )}
          </nav>
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

      {moveError && (
        <div
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {moveError}
        </div>
      )}

      {permissions.canEditSchedule && selectedDate && selectedDay && (
        <div className={`fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40 px-0 md:px-4 py-0 md:py-8 transition-opacity duration-200 ${sheetEntered ? "opacity-100" : "opacity-0"} md:opacity-100`}>
          <div className={`w-full max-h-[85vh] md:max-h-none max-w-md md:max-w-2xl rounded-t-2xl md:rounded-2xl border border-zinc-200 border-b-0 md:border-b bg-white p-4 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-900 overflow-y-auto transition-transform duration-200 ease-out ${sheetEntered ? "translate-y-0" : "translate-y-full md:translate-y-0"}`}>
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

            {/* ランク / 予定 タブ */}
            <div className="mb-3 inline-flex rounded-full bg-zinc-100 p-1 text-[11px] text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
              <button
                type="button"
                onClick={() => setModalTab("rank")}
                className={`rounded-full px-3 py-1 ${
                  modalTab === "rank"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                ランク
              </button>
              <button
                type="button"
                onClick={() => setModalTab("schedule")}
                className={`rounded-full px-3 py-1 ${
                  modalTab === "schedule"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                予定
              </button>
            </div>

            {/* タブ内容 */}
            {modalTab === "rank" && (
              <div className="space-y-3">
                <ScheduleForm
                  calendarId={calendarId}
                  defaultDate={selectedDate}
                  action={handleSave}
                  events={events}
                  defaultTargetPlus={selectedDay?.entries[0]?.target_plus}
                  defaultActualPlus={selectedDay?.entries[0]?.actual_plus}
                  defaultAnsukoBaseline={selectedDay?.entries[0]?.ansuko_baseline}
                  defaultBorderPlus2={selectedDay?.entries[0]?.border_plus2}
                  defaultBorderPlus4={selectedDay?.entries[0]?.border_plus4}
                  defaultBorderPlus6={selectedDay?.entries[0]?.border_plus6}
                  defaultEventId={effectiveDefaultEventId}
                  defaultMemo={selectedDay?.entries[0]?.memo}
                  defaultSkipPassUsed={selectedDay?.entries[0]?.skip_pass_used}
                  skipPassRemaining={skipPassRemaining}
                  defaultStreamContent={selectedDay?.entries[0]?.stream_content}
                  defaultStreamContentColor={selectedDay?.entries[0]?.stream_content_color}
                />
              </div>
            )}

            {modalTab === "schedule" && (
              <div className="space-y-3">
                {saveScheduleAction && (
                  <DayScheduleForm
                    calendarId={calendarId}
                    date={selectedDate}
                    initialSchedule={selectedSchedule}
                  />
                )}
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50">
                    この日の予定一覧
                  </p>
                  {selectedSchedules.length > 0 && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {selectedSchedules.length}件
                    </span>
                  )}
                </div>
                {selectedSchedules.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    まだ予定がありません。上のフォームから追加できます。
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {selectedSchedules.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => setSelectedScheduleId(s.id)}
                        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] text-zinc-800 dark:text-zinc-100 cursor-pointer ${
                          selectedScheduleId === s.id
                            ? "bg-accent-50 border border-accent-200 dark:bg-accent-950/40 dark:border-accent-700"
                            : "bg-zinc-50 dark:bg-zinc-800/80"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1">
                            <span className="inline-flex items-center rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                              {s.kind === "personal" ? "個人" : s.kind === "stream" ? "配信" : "その他"}
                            </span>
                            <span className="truncate">
                              {s.is_all_day
                                ? "終日"
                                : `${s.start_time?.slice(0, 5) ?? "--:--"}〜${s.end_time?.slice(0, 5) ?? "--:--"}`}
                            </span>
                          </p>
                          <p className="truncate text-[11px] font-medium">
                            {s.title}
                          </p>
                          {s.memo && (
                            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                              {s.memo}
                            </p>
                          )}
                        </div>
                        {permissions.isOwner && deleteScheduleAction && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteScheduleAction(s.id);
                              if (selectedScheduleId === s.id) {
                                setSelectedScheduleId(null);
                              }
                            }}
                            className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                            aria-label="予定を削除"
                          >
                            🗑
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!permissions.canEditSchedule && selectedDate && selectedDay && detailRowForModal && (
        <DayDetailModal
          row={detailRowForModal}
          events={events}
          permissions={permissions}
          calendarId={calendarId}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

