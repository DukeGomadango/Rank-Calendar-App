"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { MantineProvider } from "@mantine/core";
import { TimeInput } from "@mantine/dates";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { useToast } from "@/lib/toast-context";
import { getRankBarDashedLineColorClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { EVENT_PALETTE, getEventColorClasses, getEventColorDotClass } from "@/lib/event-colors";
import { toJstDateString } from "@/lib/domain/calendar";
import {
  assignWeekColumnLayout,
  MINUTES_PER_DAY,
  snapMinutesToSlot,
  WEEK_VIEW_SLOT_MINUTES,
  type WeekViewSegment,
} from "@/lib/domain/week-view-layout";
import { useViewMode } from "@/lib/view-mode-context";
import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { SparklesIcon, NoteIcon, TrashIcon } from "@/components/icons/DashboardIcons";
import { ScheduleForm } from "./ScheduleForm";
import { WeekScheduleBlockPopover } from "./WeekScheduleBlockPopover";
import { DayDetailModal, type DayDetailRow } from "@/components/data/DayDetailModal";
import {
  scheduleShowsInWeekAllDayRow,
  scheduleShowsInWeekTimeGrid,
} from "@/lib/domain/schedule-week-display";

dayjs.locale("ja");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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
  /** 親側で月変更を扱いたい場合のコールバック（指定があれば router.push は使わない） */
  onChangeMonth?: (month: string) => void;
  /** 親側で週変更を扱いたい場合のコールバック */
  onChangeWeek?: (month: string, weekStart: string) => void;
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
  /** 予定（calendar_schedules）の開始日時を基準に移動/コピーする Server Action */
  shiftScheduleAction?: (
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => Promise<void>;
  /** 週ビュー: 予定の上下リサイズ */
  resizeScheduleAction?: (
    scheduleId: string,
    edge: "start" | "end",
    newDate: string,
    newTime: string
  ) => Promise<void>;
  /** 週ビュー: Undo / Redo（Server + DB スタック） */
  undoScheduleAction?: () => Promise<void>;
  redoScheduleAction?: () => Promise<void>;
};

/** 日付が周期範囲内か判定 */
function dateInCycle(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
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
  onChangeMonth,
  onChangeWeek,
  moveEntry,
  saveAction,
  events,
  currentRankCycle = null,
  rankCycleHistory = [],
  futureCycles = [],
  todayJst,
  skipPassRemaining,
  schedules = [],
  saveScheduleAction,
  deleteScheduleAction,
  shiftScheduleAction,
  resizeScheduleAction,
  undoScheduleAction,
  redoScheduleAction,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { mutateRange, refreshRange } = useDashboardCalendar();
  const { viewMode, setViewMode } = useViewMode();
  const todayStr = todayJst ?? toJstDateString(new Date());

  const [localDays, setLocalDays] = useState<DayData[]>(days);
  const [localSchedules, setLocalSchedules] = useState<CalendarScheduleRow[]>(schedules);
  const [moveError, setMoveError] = useState<string | null>(null);
  const prevLocalDaysRef = useRef<DayData[] | null>(null);
  const isSavingRef = useRef(false);
  const scheduleShiftPendingRef = useRef(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  /** 日別編集シートを開くか（週ビューは予定クリックだけでは false のまま） */
  const [isDayEditModalOpen, setIsDayEditModalOpen] = useState(false);
  /** 週ビュー: 予定プレビュー Popover */
  const [weekSchedulePreviewOpen, setWeekSchedulePreviewOpen] = useState(false);
  /** モバイルでボトムシートを下からせり上がらせる用。開いた直後に true にして transition をかける */
  const [sheetEntered, setSheetEntered] = useState(false);

  useEffect(() => {
    if (isSavingRef.current) return;
    setLocalDays(days);
  }, [days]);

  useEffect(() => {
    if (scheduleShiftPendingRef.current > 0) return;
    setLocalSchedules(schedules);
  }, [schedules]);

  useEffect(() => {
    if (!selectedDate || !isDayEditModalOpen) {
      setSheetEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDate, isDayEditModalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (weekSchedulePreviewOpen) {
        e.preventDefault();
        setWeekSchedulePreviewOpen(false);
        return;
      }
      if (isDayEditModalOpen && selectedDate) {
        e.preventDefault();
        setSelectedDate(null);
        setSelectedScheduleId(null);
        setScheduleCreatePrefill(null);
        setScheduleCreateSelection(null);
        setIsDayEditModalOpen(false);
        return;
      }
      if (selectedDate) {
        e.preventDefault();
        setSelectedDate(null);
        setSelectedScheduleId(null);
        setScheduleCreatePrefill(null);
        setScheduleCreateSelection(null);
      }
    };
    if (!selectedDate && !weekSchedulePreviewOpen) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDate, weekSchedulePreviewOpen, isDayEditModalOpen]);

  useEffect(() => {
    if (view === "month") setWeekSchedulePreviewOpen(false);
  }, [view]);

  const selectedDay = selectedDate
    ? localDays.find((d) => d.date === selectedDate) ?? null
    : null;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const d of localDays) map.set(d.date, []);

    if (events.length === 0 || localDays.length === 0) return map;

    const rangeStart = localDays[0]?.date;
    const rangeEnd = localDays[localDays.length - 1]?.date;
    if (!rangeStart || !rangeEnd) return map;

    const dateSet = new Set(localDays.map((d) => d.date));

    for (const ev of events) {
      const start = ev.start_date ?? ev.end_date;
      const end = ev.end_date ?? ev.start_date;
      if (start == null || end == null) continue;

      // event が画面レンジ外の場合は無視
      const clampedStart = start < rangeStart ? rangeStart : start;
      const clampedEnd = end > rangeEnd ? rangeEnd : end;
      if (clampedStart > clampedEnd) continue;

      let cursor = dayjs(clampedStart, "YYYY-MM-DD");
      const endDay = dayjs(clampedEnd, "YYYY-MM-DD");
      while (cursor.isSame(endDay) || cursor.isBefore(endDay)) {
        const dateStr = cursor.format("YYYY-MM-DD");
        if (dateSet.has(dateStr)) {
          const list = map.get(dateStr);
          if (list) list.push(ev);
        }
        cursor = cursor.add(1, "day");
      }
    }

    return map;
  }, [events, localDays]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, CalendarScheduleRow[]>();
    const dateSet = new Set(localDays.map((d) => d.date));

    const canSee = (s: CalendarScheduleRow): boolean => {
      if (permissions.isOwner) return true;
      switch (s.kind) {
        case "stream":
          return permissions.canViewScheduleStream;
        case "personal":
          return permissions.canViewSchedulePersonal;
        case "secret":
          return permissions.canViewScheduleSecret;
        default:
          // kind 未設定の場合は「配信 or 通常個人」扱いとして、どちらかの権限があれば表示
          return permissions.canViewScheduleStream || permissions.canViewSchedulePersonal;
      }
    };

    for (const s of localSchedules) {
      if (!canSee(s)) continue;
      const start = s.date;
      const end = s.end_date ?? s.date;
      if (!start || !end) continue;

      let cursor = dayjs(start, "YYYY-MM-DD");
      const endDay = dayjs(end, "YYYY-MM-DD");
      while (cursor.isSame(endDay) || cursor.isBefore(endDay)) {
        const dateStr = cursor.format("YYYY-MM-DD");
        if (dateSet.has(dateStr)) {
          const list = map.get(dateStr) ?? [];
          list.push(s);
          map.set(dateStr, list);
        }
        cursor = cursor.add(1, "day");
      }
    }

    // 各日の中で、終日→開始時刻順の順に並べる
    for (const [key, list] of map) {
      list.sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        const segStart = (s: CalendarScheduleRow): string => {
          if (s.is_all_day) return "";
          if (key === s.date) return (s.start_time ?? "").slice(0, 5);
          // 途中日: 基本的に「その日の00:00扱い」で並べる
          return "00:00";
        };
        return segStart(a).localeCompare(segStart(b));
      });
      map.set(key, list);
    }
    return map;
  }, [permissions, localSchedules, localDays]);

  const selectedSchedules = selectedDate
    ? schedulesByDate.get(selectedDate) ?? []
    : [];

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  /** 範囲指定で新規作成する場合の入力プリフィル（selectedScheduleId が null のときに使う） */
  const [scheduleCreatePrefill, setScheduleCreatePrefill] = useState<
    | null
    | {
        is_all_day: false;
        startTime: string; // HH:MM
        endTime: string; // HH:MM
        endDate: string; // YYYY-MM-DD
      }
  >(null);
  /** 時間グリッド上のドラッグ範囲（新規作成用） */
  const [scheduleCreateSelection, setScheduleCreateSelection] = useState<
    | null
    | {
        dayDate: string; // columnのYYYY-MM-DD（軸の開始日）
        startOffsetMinutes: number; // axis start(05:00)からのオフセット
        endOffsetMinutes: number;
      }
  >(null);
  const scheduleCreateSelectionRef = useRef<typeof scheduleCreateSelection>(null);
  const [modalTab, setModalTab] = useState<"rank" | "schedule">("rank");

  useEffect(() => {
    scheduleCreateSelectionRef.current = scheduleCreateSelection;
  }, [scheduleCreateSelection]);

  /** 週ビュー: HTML5 ドラッグ中のドロップ先プレビュー */
  const [scheduleDragPreview, setScheduleDragPreview] = useState<
    | null
    | {
        columnDate: string;
        startTime: string;
        endTime: string;
      }
  >(null);
  /** 週ビュー: リサイズドラッグ中のゴースト（絶対時刻 ms） */
  const [scheduleResizePreview, setScheduleResizePreview] = useState<
    | null
    | {
        columnDate: string;
        scheduleId: string;
        startMs: number;
        endMs: number;
      }
  >(null);
  const scheduleDragDurationMsRef = useRef(0);
  const weekTimeGridRef = useRef<HTMLDivElement | null>(null);

  const selectedSchedule =
    selectedScheduleId && selectedDate
      ? (schedulesByDate.get(selectedDate) ?? []).find((s) => s.id === selectedScheduleId) ?? null
      : null;

  /** 参加イベントの初期値。スケジュールに event_id が無くても、その日をまたぐイベントが1件だけならそれを選ぶ */
  const effectiveDefaultEventId =
    selectedDay?.entries[0]?.event_id ??
    (selectedDate && (() => {
      const onDay = eventsByDate.get(selectedDate) ?? [];
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
      isSavingRef.current = true;

      // `nextEntry` を先に生成しておき、localDays と SWR cache の両方を同じ内容で楽観更新する。
      const existingEntry = localDays.find((d) => d.date === date)?.entries[0] ?? null;
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
        id: existingEntry?.id ?? `temp-${date}`,
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
        stream_content: streamContentRaw ? (String(streamContentRaw).trim() || null) : null,
        stream_content_color: streamContentColorRaw ? String(streamContentColorRaw) || null : null,
      };

      setLocalDays((prev) =>
        prev.map((day) => {
          if (day.date !== date) return day;
          return {
            ...day,
            entries: [nextEntry],
          };
        })
      );

      setSelectedDate(null);
      setIsDayEditModalOpen(false);
      setWeekSchedulePreviewOpen(false);

      // SWR cache（rangeData.entries）も同じ内容で楽観更新し、再検証中の「巻き戻り」を見せない。
      void mutateRange(
        (current) => {
          if (!current) return current;
          const prevEntries = (current.entries ?? []) as unknown as ScheduleEntryRow[];
          const nextEntries = (() => {
            const replaced = prevEntries.map((e) => (e.date === date ? { ...e, ...nextEntry } : e));
            const exists = prevEntries.some((e) => e.date === date);
            return exists ? replaced : [...replaced, nextEntry].sort((a, b) => a.date.localeCompare(b.date));
          })();
          return { ...current, entries: nextEntries };
        },
        { revalidate: false, populateCache: true }
      );

      Promise.resolve(saveAction(formData))
        .then(() => {
          showToast("保存しました");
          // スキップ使用時は `calendar_rank_state`（周期のリセット日や残り枚数）が更新されるため、
          // 楽観的に `entries` だけ更新している間でも、ランク表示（周期バンド等）は必ず再検証する。
          void refreshRange({ modes: ["calendar", "data"] });
        })
        .catch(() => {
          if (prevLocalDaysRef.current) {
            setLocalDays(prevLocalDaysRef.current);
          }
          // SWR も再検証して戻す（local rollback に合わせて整合させる）
          void mutateRange();
          prevLocalDaysRef.current = null;
          showToast("保存に失敗しました");
        })
        .finally(() => {
          isSavingRef.current = false;
        });
    },
    [localDays, mutateRange, saveAction, showToast]
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
      if (onChangeMonth) {
        onChangeMonth(month);
        return;
      }
      setIsNavigating(true);
      router.push(`/dashboard/calendar?month=${month}`);
    },
    [onChangeMonth, router]
  );

  const goToWeek = useCallback(
    (month: string, weekStart: string) => {
      if (onChangeWeek) {
        onChangeWeek(month, weekStart);
        return;
      }
      setIsNavigating(true);
      router.push(`/dashboard/calendar?month=${month}&week=${weekStart}`);
    },
    [onChangeWeek, router]
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
    [calendarId, localDays, moveEntry, showToast]
  );

  const applyOptimisticScheduleShift = useCallback(
    (
      scheduleId: string,
      mode: "move" | "copy",
      newStartDate: string,
      newStartTime: string | null
    ): { applied: boolean; rollback: () => void } => {
      let snapshotLocal: CalendarScheduleRow[] | null = null;
      let snapshotCache: CalendarScheduleRow[] | null = null;
      let applied = false;
      const optimisticId = `temp-shift-${scheduleId}-${Date.now()}`;
      const optimisticCreatedAt = new Date().toISOString();

      const parseYMD = (d: string): { y: number; mo: number; da: number } => {
        const [y, mo, da] = d.split("-").map((v) => Number(v));
        return { y, mo, da };
      };
      const parseHHMM = (t: string): { hh: number; mm: number } => {
        const [hh, mm] = t.split(":").map((v) => Number(v));
        return { hh, mm };
      };
      const toUtcMs = (dateStr: string, timeStr: string): number => {
        const { y, mo, da } = parseYMD(dateStr);
        const { hh, mm } = parseHHMM(timeStr);
        return Date.UTC(y, mo - 1, da, hh, mm, 0);
      };
      const formatYMD = (ms: number): string => {
        const dt = new Date(ms);
        const y = dt.getUTCFullYear();
        const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
        const da = String(dt.getUTCDate()).padStart(2, "0");
        return `${y}-${mo}-${da}`;
      };
      const formatHHMMSS = (ms: number): string => {
        const dt = new Date(ms);
        const hh = String(dt.getUTCHours()).padStart(2, "0");
        const mm = String(dt.getUTCMinutes()).padStart(2, "0");
        return `${hh}:${mm}:00`;
      };

      const buildShifted = (
        source: CalendarScheduleRow
      ): CalendarScheduleRow | null => {
        const sourceStartDate = source.date;
        const sourceEndDate = source.end_date ?? source.date;
        if (source.is_all_day) {
          const msPerDay = 24 * 60 * 60 * 1000;
          const startMs = Date.UTC(
            parseYMD(sourceStartDate).y,
            parseYMD(sourceStartDate).mo - 1,
            parseYMD(sourceStartDate).da,
            0,
            0,
            0
          );
          const endMs = Date.UTC(
            parseYMD(sourceEndDate).y,
            parseYMD(sourceEndDate).mo - 1,
            parseYMD(sourceEndDate).da,
            0,
            0,
            0
          );
          const durationDays = Math.round((endMs - startMs) / msPerDay) + 1;
          const newStartMs = Date.UTC(
            parseYMD(newStartDate).y,
            parseYMD(newStartDate).mo - 1,
            parseYMD(newStartDate).da,
            0,
            0,
            0
          );
          const newEndMs = newStartMs + (durationDays - 1) * msPerDay;
          const computedEndDate = formatYMD(newEndMs);

          return {
            ...source,
            date: newStartDate,
            end_date: computedEndDate === newStartDate ? null : computedEndDate,
            start_time: null,
            end_time: null,
          };
        }
        if (!newStartTime || !source.start_time || !source.end_time) return null;

        const sourceStartMs = toUtcMs(sourceStartDate, source.start_time);
        const sourceEndMs = toUtcMs(sourceEndDate, source.end_time);
        const durationMs = sourceEndMs - sourceStartMs;
        if (durationMs < 0) return null;

        const newStartMs = toUtcMs(newStartDate, newStartTime);
        const newEndMs = newStartMs + durationMs;
        const computedEndDate = formatYMD(newEndMs);

        return {
          ...source,
          date: newStartDate,
          end_date: computedEndDate === newStartDate ? null : computedEndDate,
          start_time: `${newStartTime}:00`,
          end_time: formatHHMMSS(newEndMs),
        };
      };

      setLocalSchedules((prev) => {
        const source = prev.find((s) => s.id === scheduleId);
        if (!source) return prev;
        const shifted = buildShifted(source);
        if (!shifted) return prev;

        snapshotLocal = prev;
        applied = true;

        if (mode === "copy") {
          return [
            ...prev,
            {
              ...shifted,
              id: optimisticId,
              created_at: optimisticCreatedAt,
            },
          ];
        }

        return prev.map((s) => (s.id === source.id ? shifted : s));
      });

      void mutateRange(
        (current) => {
          if (!current) return current;
          const prevSchedules = (current.schedules ?? []) as unknown as CalendarScheduleRow[];
          const source = prevSchedules.find((s) => s.id === scheduleId);
          if (!source) return current;
          const shifted = buildShifted(source);
          if (!shifted) return current;

          snapshotCache = prevSchedules;
          applied = true;

          const nextSchedules =
            mode === "copy"
              ? [
                  ...prevSchedules,
                  {
                    ...shifted,
                    id: optimisticId,
                    created_at: optimisticCreatedAt,
                  },
                ]
              : prevSchedules.map((s) => (s.id === source.id ? shifted : s));

          return { ...current, schedules: nextSchedules };
        },
        { revalidate: false, populateCache: true }
      );

      const rollback = () => {
        if (snapshotLocal) setLocalSchedules(snapshotLocal);
        if (snapshotCache) {
          void mutateRange(
            (current) => {
              if (!current) return current;
              return { ...current, schedules: snapshotCache as CalendarScheduleRow[] };
            },
            { revalidate: false, populateCache: true }
          );
        } else {
          void mutateRange();
        }
      };

      return { applied, rollback };
    },
    [mutateRange]
  );

  const applyOptimisticSchedulePatch = useCallback(
    (scheduleId: string, next: CalendarScheduleRow): { applied: boolean; rollback: () => void } => {
      let snapshotLocal: CalendarScheduleRow[] | null = null;
      let snapshotCache: CalendarScheduleRow[] | null = null;
      let applied = false;

      setLocalSchedules((prev) => {
        const source = prev.find((s) => s.id === scheduleId);
        if (!source) return prev;
        snapshotLocal = prev;
        applied = true;
        return prev.map((s) => (s.id === scheduleId ? next : s));
      });

      void mutateRange(
        (current) => {
          if (!current) return current;
          const prevSchedules = (current.schedules ?? []) as unknown as CalendarScheduleRow[];
          if (!prevSchedules.some((s) => s.id === scheduleId)) return current;
          snapshotCache = prevSchedules;
          applied = true;
          return {
            ...current,
            schedules: prevSchedules.map((s) => (s.id === scheduleId ? next : s)),
          };
        },
        { revalidate: false, populateCache: true }
      );

      const rollback = () => {
        if (snapshotLocal) setLocalSchedules(snapshotLocal);
        if (snapshotCache) {
          void mutateRange(
            (current) => {
              if (!current) return current;
              return { ...current, schedules: snapshotCache as CalendarScheduleRow[] };
            },
            { revalidate: false, populateCache: true }
          );
        } else {
          void mutateRange();
        }
      };

      return { applied, rollback };
    },
    [mutateRange]
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
    prefill,
  }: {
    calendarId: string;
    date: string;
    initialSchedule?: CalendarScheduleRow | null;
    prefill?: {
      is_all_day: false;
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      endDate: string; // YYYY-MM-DD
    } | null;
  }) {
    const idPrefix = useId();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const { pending } = useFormStatus();
    const loading = pending || isSubmitting;
    const startDateForEdit = initialSchedule?.date ?? date;

    const [startTime, setStartTime] = useState<string>(
      initialSchedule?.start_time ? initialSchedule.start_time.slice(0, 5) : prefill?.startTime ?? ""
    );
    const [endTime, setEndTime] = useState<string>(
      initialSchedule?.end_time ? initialSchedule.end_time.slice(0, 5) : prefill?.endTime ?? ""
    );
    const [endDate, setEndDate] = useState<string>(
      initialSchedule?.end_date ?? prefill?.endDate ?? startDateForEdit
    );

    useEffect(() => {
      const nextStartDate = initialSchedule?.date ?? date;
      setStartTime(
        initialSchedule?.start_time ? initialSchedule.start_time.slice(0, 5) : prefill?.startTime ?? ""
      );
      setEndTime(
        initialSchedule?.end_time ? initialSchedule.end_time.slice(0, 5) : prefill?.endTime ?? ""
      );
      setEndDate(
        initialSchedule?.end_date ?? prefill?.endDate ?? nextStartDate
      );
    }, [
      date,
      initialSchedule?.id,
      initialSchedule?.date,
      initialSchedule?.end_date,
      initialSchedule?.start_time,
      initialSchedule?.end_time,
      prefill?.startTime,
      prefill?.endTime,
      prefill?.endDate,
    ]);

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
        <input type="hidden" name="date" value={startDateForEdit} />
        <input type="hidden" name="end_date" value={endDate} />
        <input type="hidden" name="start_time" value={startTime} />
        <input type="hidden" name="end_time" value={endTime} />
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
            {/* モバイル向け: ネイティブ time input（小画面で表示） */}
            <div className="flex items-center gap-1 md:hidden">
              <input
                type="time"
                className={`${inputBaseClass} h-6 w-20`}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <span>〜</span>
              <input
                type="time"
                className={`${inputBaseClass} h-6 w-20`}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            {/* PC向け: Mantine の TimeInput（中画面以上で表示） */}
            <div className="hidden items-center gap-1 md:flex">
              <MantineProvider>
                <TimeInput
                  className="w-24"
                  value={startTime}
                  onChange={(event) => setStartTime(event.currentTarget.value)}
                  withSeconds={false}
                  aria-label="開始時刻"
                />
              </MantineProvider>
              <span>〜</span>
              <MantineProvider>
                <TimeInput
                  className="w-24"
                  value={endTime}
                  onChange={(event) => setEndTime(event.currentTarget.value)}
                  withSeconds={false}
                  aria-label="終了時刻"
                />
              </MantineProvider>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
            終了日
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputBaseClass}
          />
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
              <option value="secret">秘密</option>
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
            {loading ? "保存中..." : initialSchedule ? "予定を更新" : "予定を保存"}
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

  const formatMinutesAsHoursMinutes = (minutes: number): string => {
    const m = Math.max(0, Math.floor(minutes));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h > 0 ? `${h}時間${r}分` : `${r}分`;
  };

  const streamTimeTotals = useMemo(() => {
    // 月ビュー上部の集計表示（stream のみ）
    const canSeeStream = permissions.isOwner || permissions.canViewScheduleStream;
    if (!canSeeStream) {
      return { plannedMinutes: 0, actualMinutes: 0 };
    }

    const msPerMinute = 60 * 1000;

    const parseYMD = (d: string): { y: number; mo: number; da: number } => {
      const [y, mo, da] = d.split("-").map((v) => Number(v));
      return { y, mo, da };
    };

    /** DB の time 文字列（HH:MM / HH:MM:SS 等）から HH:MM を抽出 */
    const wallClockHHMM = (t: string | null | undefined): string | null => {
      if (t == null) return null;
      const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
      if (!m) return null;
      const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
      const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    const parseHHMM = (hhmm: string): { hh: number; mm: number } => {
      const [hh, mm] = hhmm.split(":").map((v) => Number(v));
      return { hh, mm };
    };

    const toUtcMs = (dateStr: string, timeStr: string): number => {
      const { y, mo, da } = parseYMD(dateStr);
      const { hh, mm } = parseHHMM(timeStr);
      return Date.UTC(y, mo - 1, da, hh, mm, 0);
    };

    /** 予定の絶対開始・終了（深夜跨ぎは end_date または 終了時刻が開始より前なら翌日に補正） */
    const getScheduleSpanMs = (s: CalendarScheduleRow): { startMs: number; endMs: number } | null => {
      // いま必要なのは時間付き stream なので、is_all_day は呼び出し側で弾く
      const st = wallClockHHMM(s.start_time);
      const et = wallClockHHMM(s.end_time);
      if (!st || !et) return null;

      const startMs = toUtcMs(s.date, st);
      const endDay = s.end_date ?? s.date;
      let endMs = toUtcMs(endDay, et);
      if (endMs <= startMs) {
        endMs = toUtcMs(dayjs(s.date).add(1, "day").format("YYYY-MM-DD"), et);
      }
      return { startMs, endMs };
    };

    const monthStart = dayjs(`${currentMonthParam}-01`, "YYYY-MM-DD", true).startOf("month");
    const monthStartYMD = monthStart.format("YYYY-MM-DD");
    const monthEndExclusiveYMD = monthStart.add(1, "month").startOf("month").format("YYYY-MM-DD");

    const monthStartMs = toUtcMs(monthStartYMD, "00:00");
    const monthEndExclusiveMs = toUtcMs(monthEndExclusiveYMD, "00:00");

    // 実績＝「今月の過去」：日付基準で今日（当日 00:00〜）は除外
    const todayStartMs = toUtcMs(todayStr, "00:00");

    let plannedMinutes = 0;
    let actualMinutes = 0;

    for (const s of localSchedules) {
      if (s.kind !== "stream") continue;
      if (s.is_all_day) continue; // 終日配信はカウントしない

      const span = getScheduleSpanMs(s);
      if (!span) continue;

      // planned：月内スパンを切り取って合算
      const plannedStart = Math.max(span.startMs, monthStartMs);
      const plannedEnd = Math.min(span.endMs, monthEndExclusiveMs);
      if (plannedEnd > plannedStart) {
        plannedMinutes += Math.round((plannedEnd - plannedStart) / msPerMinute);
      }

      // actual：月内かつ「今日開始以前」まで切り取って合算（今日分は除外）
      const actualStart = Math.max(span.startMs, monthStartMs);
      const actualEnd = Math.min(span.endMs, monthEndExclusiveMs, todayStartMs);
      if (actualEnd > actualStart) {
        actualMinutes += Math.round((actualEnd - actualStart) / msPerMinute);
      }
    }

    return { plannedMinutes, actualMinutes };
  }, [localSchedules, currentMonthParam, todayStr, permissions.isOwner, permissions.canViewScheduleStream]);

  const renderMonthGrid = () => (
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
                const eventsOnDay = permissions.canViewEvents
                  ? eventsByDate.get(day.date) ?? []
                  : [];
                const showBordersInCell = permissions.canViewBorders && viewMode === "detailed";

                // 月ビューのセル表示は「予定の開始日」に限定する（跨ぎ予定の重複表示を防ぐ）
                const daySchedules = (schedulesByDate.get(day.date) ?? []).filter(
                  (s) => s.date === day.date
                );
                const streamSchedules = daySchedules.filter((s) => s.kind === "stream");
                const streamToDisplay = streamSchedules.slice(0, 2);
                const remainingStreamCount = streamSchedules.length - streamToDisplay.length;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.date);
                      if (permissions.canEditSchedule) {
                        setIsDayEditModalOpen(true);
                        setWeekSchedulePreviewOpen(false);
                      }
                    }}
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
                        {!isSkip && streamToDisplay.length > 0 && (
                          <div className="mt-0.5 flex flex-col gap-px -mx-1.5 shrink-0">
                            {streamToDisplay.map((s) => {
                              const labelTime = s.is_all_day
                                ? "終日"
                                : s.start_time && s.end_time
                                  ? `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`
                                  : s.start_time
                                    ? s.start_time.slice(0, 5)
                                    : "--:--";
                              const color = getEventColorClasses(s.color_id ?? null);
                              return (
                                <div
                                  key={s.id}
                                  className={`flex items-center gap-1 rounded-r py-px pl-1 text-[9px] font-medium line-clamp-1 ${color.leftBar} ${color.bg} ${color.text}`}
                                  title={s.title}
                                >
                                  <span className="shrink-0 tabular-nums">{labelTime}</span>
                                  <span className="min-w-0 truncate">{s.title}</span>
                                </div>
                              );
                            })}
                            {remainingStreamCount > 0 && (
                              <div className="pl-1 text-[8px] text-zinc-500 dark:text-zinc-400">
                                +{remainingStreamCount}件
                              </div>
                            )}
                          </div>
                        )}
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

  const scheduleClipboardRef = useRef<CalendarScheduleRow | null>(null);

  const handleWeekGridKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLElement>) => {
      if (view !== "week") return;
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!permissions.canEditSchedule) return;

      const sel =
        selectedDate && selectedScheduleId
          ? (schedulesByDate.get(selectedDate) ?? []).find((x) => x.id === selectedScheduleId)
          : undefined;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        try {
          await undoScheduleAction?.();
          void mutateRange();
        } catch {
          showToast("元に戻せませんでした");
        }
        return;
      }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        try {
          await redoScheduleAction?.();
          void mutateRange();
        } catch {
          showToast("やり直せませんでした");
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "c" && sel) {
        e.preventDefault();
        scheduleClipboardRef.current = sel;
        showToast("コピーしました");
        return;
      }
      if (mod && e.key.toLowerCase() === "x" && sel && deleteScheduleAction) {
        e.preventDefault();
        scheduleClipboardRef.current = sel;
        try {
          await deleteScheduleAction(sel.id);
          setWeekSchedulePreviewOpen(false);
          setSelectedScheduleId(null);
          showToast("切り取りました");
          void mutateRange();
        } catch {
          showToast("削除に失敗しました");
        }
        return;
      }
      if (
        !mod &&
        (e.key === "Delete" || e.key === "Backspace") &&
        sel &&
        deleteScheduleAction
      ) {
        e.preventDefault();
        try {
          await deleteScheduleAction(sel.id);
          setWeekSchedulePreviewOpen(false);
          setSelectedScheduleId(null);
          showToast("削除しました");
          void mutateRange();
        } catch {
          showToast("削除に失敗しました");
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && scheduleClipboardRef.current && shiftScheduleAction) {
        e.preventDefault();
        const src = scheduleClipboardRef.current;
        const pasteDate = selectedDate ?? weekDays[0]?.date;
        if (!pasteDate) return;
        try {
          if (src.is_all_day) {
            await shiftScheduleAction(src.id, "copy", pasteDate, null);
          } else {
            const t = src.start_time ? src.start_time.slice(0, 5) : "09:00";
            await shiftScheduleAction(src.id, "copy", pasteDate, t);
          }
          showToast("貼り付けました");
          void mutateRange();
        } catch {
          showToast("貼り付けに失敗しました");
        }
      }
    },
    [
      view,
      permissions.canEditSchedule,
      selectedDate,
      selectedScheduleId,
      schedulesByDate,
      undoScheduleAction,
      redoScheduleAction,
      deleteScheduleAction,
      shiftScheduleAction,
      mutateRange,
      showToast,
      weekDays,
      setWeekSchedulePreviewOpen,
    ]
  );

  useEffect(() => {
    const clear = () => {
      setScheduleDragPreview(null);
      scheduleDragDurationMsRef.current = 0;
      setScheduleResizePreview(null);
    };
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, []);

  const renderWeekGrid = () => {
    // 各列は「カレンダー日 D の 0:00 〜 翌日 0:00（24h）」。
    // 旧: 5:00〜翌3:00 の22h軸だと、翌日未明の部分が前日列に吸い込まれ水曜列に出ない・帯が不自然になる。
    const totalMinutes = 24 * 60;
    const msPerMinute = 60 * 1000;
    const canCreate = permissions.canEditSchedule && !!saveScheduleAction;
    const canShift = permissions.canEditSchedule && !!shiftScheduleAction;
    const canResize = canShift && !!resizeScheduleAction;

    const parseYMD = (d: string): { y: number; mo: number; da: number } => {
      const [y, mo, da] = d.split("-").map((v) => Number(v));
      return { y, mo, da };
    };

    /** DB の time 文字列（HH:MM / HH:MM:SS 等）から HH:MM を抽出 */
    const wallClockHHMM = (t: string | null | undefined): string | null => {
      if (t == null) return null;
      const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
      if (!m) return null;
      const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
      const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    const parseHHMM = (hhmm: string): { hh: number; mm: number } => {
      const [hh, mm] = hhmm.split(":").map((v) => Number(v));
      return { hh, mm };
    };

    const toUtcMs = (dateStr: string, timeStr: string): number => {
      const { y, mo, da } = parseYMD(dateStr);
      const { hh, mm } = parseHHMM(timeStr);
      return Date.UTC(y, mo - 1, da, hh, mm, 0);
    };

    const formatHHMMFromUtcMs = (ms: number): string => {
      const dt = new Date(ms);
      const h = String(dt.getUTCHours()).padStart(2, "0");
      const m = String(dt.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };

    const formatYMDFromUtcMs = (ms: number): string => {
      const dt = new Date(ms);
      const y = dt.getUTCFullYear();
      const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const da = String(dt.getUTCDate()).padStart(2, "0");
      return `${y}-${mo}-${da}`;
    };

    const pointerYToSnappedMinutes = (rect: DOMRect, clientY: number): number => {
      const y = clientY - rect.top;
      const clampedY = Math.max(0, Math.min(rect.height, y));
      const raw = (clampedY / rect.height) * totalMinutes;
      const snapped = snapMinutesToSlot(raw, WEEK_VIEW_SLOT_MINUTES);
      return Math.min(snapped, MINUTES_PER_DAY - WEEK_VIEW_SLOT_MINUTES);
    };

    const snapDeltaMinutesFromDrag = (rect: DOMRect, deltaY: number): number => {
      const raw = (deltaY / rect.height) * MINUTES_PER_DAY;
      return Math.round(raw / WEEK_VIEW_SLOT_MINUTES) * WEEK_VIEW_SLOT_MINUTES;
    };

    /** 予定の絶対開始・終了（深夜跨ぎは end_date または 終了時刻が開始より前なら翌日に補正） */
    const getScheduleSpanMs = (
      s: CalendarScheduleRow
    ): { startMs: number; endMs: number } | null => {
      const st = wallClockHHMM(s.start_time);
      const et = wallClockHHMM(s.end_time);
      if (!st || !et) return null;
      const startMs = toUtcMs(s.date, st);
      const endDay = s.end_date ?? s.date;
      let endMs = toUtcMs(endDay, et);
      if (endMs <= startMs) {
        endMs = toUtcMs(dayjs(s.date).add(1, "day").format("YYYY-MM-DD"), et);
      }
      return { startMs, endMs };
    };

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
        onKeyDown={handleWeekGridKeyDown}
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
  };

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

      {permissions.canEditSchedule && isDayEditModalOpen && selectedDate && selectedDay && (
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
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedScheduleId(null);
                  setScheduleCreatePrefill(null);
                  setScheduleCreateSelection(null);
                  setIsDayEditModalOpen(false);
                  setWeekSchedulePreviewOpen(false);
                }}
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
                    prefill={scheduleCreatePrefill}
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
                    {selectedSchedules.map((s, index) => {
                      const isSelected = selectedScheduleId === s.id;
                      const isFirst = index === 0;
                      const isLast = index === selectedSchedules.length - 1;
                      const startLabel = s.is_all_day
                        ? "終日"
                        : s.start_time && s.end_time
                          ? `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`
                          : s.start_time
                            ? s.start_time.slice(0, 5)
                            : "--:--";
                      return (
                        <li
                          key={s.id}
                          onClick={() => {
                            setSelectedScheduleId(s.id);
                            setScheduleCreatePrefill(null);
                          }}
                          className="flex gap-2 text-[11px] text-zinc-800 dark:text-zinc-100 cursor-pointer"
                        >
                          {/* 左側: 時刻 + タイムライン */}
                          <div className="flex flex-col items-center">
                            <div className="w-[5.75rem] shrink-0 text-right text-[9px] leading-tight tabular-nums text-zinc-500 dark:text-zinc-400 pr-1">
                              {startLabel}
                            </div>
                            <div className="relative flex-1">
                              <div
                                className={`absolute left-1/2 -translate-x-1/2 w-px bg-zinc-200 dark:bg-zinc-700 ${
                                  isFirst ? "top-2" : "top-0"
                                } ${isLast ? "bottom-2" : "bottom-0"}`}
                              />
                              <div className="relative mt-1 flex items-center justify-center">
                                <span
                                  className={`h-2 w-2 rounded-full border ${
                                    isSelected
                                      ? "bg-accent-500 border-accent-500"
                                      : getEventColorDotClass(s.color_id ?? null) +
                                        " border-zinc-300 dark:border-zinc-600"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 右側: 内容カード */}
                          <div
                            className={`flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1 ${
                              isSelected
                                ? "bg-accent-50 border border-accent-200 dark:bg-accent-950/40 dark:border-accent-700"
                                : "bg-zinc-50 border border-transparent dark:bg-zinc-800/80"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="mb-0.5 flex items-center gap-1">
                                <span className="inline-flex items-center rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                                  {s.kind === "personal"
                                    ? "個人"
                                    : s.kind === "stream"
                                      ? "配信"
                                      : s.kind === "secret"
                                        ? "秘密"
                                        : "その他"}
                                </span>
                                {!s.is_all_day && (
                                  <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {s.start_time?.slice(0, 5) ?? "--:--"}
                                    {s.end_time && `〜${s.end_time.slice(0, 5)}`}
                                    {s.end_date && s.end_date !== s.date
                                      ? ` (${s.end_date.slice(5)})`
                                      : null}
                                  </span>
                                )}
                                {s.is_all_day && (
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {s.end_date && s.end_date !== s.date
                                      ? `終日〜${s.end_date.slice(5)}`
                                      : "終日"}
                                  </span>
                                )}
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
                            {permissions.canEditSchedule && deleteScheduleAction && (
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
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
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
          onClose={() => {
            setSelectedDate(null);
            setSelectedScheduleId(null);
            setScheduleCreatePrefill(null);
            setScheduleCreateSelection(null);
            setIsDayEditModalOpen(false);
            setWeekSchedulePreviewOpen(false);
          }}
        />
      )}
    </div>
  );
}

