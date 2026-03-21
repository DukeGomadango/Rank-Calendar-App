"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/ja";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { useToast } from "@/lib/toast-context";
import { toJstDateString } from "@/lib/domain/calendar";
import { useViewMode } from "@/lib/view-mode-context";
import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { DayDetailModal, type DayDetailRow } from "@/components/data/DayDetailModal";
import {
  dateInCycle,
  getPeriodType,
  WEEKDAYS,
  type PeriodType,
} from "./calendar-with-modal/calendar-display-helpers";
import type { CalendarWithModalProps, DayData } from "./calendar-with-modal/types";
import { CalendarToolbar } from "./calendar-with-modal/CalendarToolbar";
import { CalendarMonthGrid } from "./calendar-with-modal/CalendarMonthGrid";
import { CalendarWeekGrid } from "./calendar-with-modal/CalendarWeekGrid";
import { CalendarDayEditSheet } from "./calendar-with-modal/CalendarDayEditSheet";

dayjs.locale("ja");

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
}: CalendarWithModalProps) {
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
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
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
  const scheduleClipboardRef = useRef<CalendarScheduleRow | null>(null);

  const handleWeekGridKeyDown = useCallback(
    async (e: ReactKeyboardEvent<HTMLElement>) => {
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

  return (
    <div className="space-y-4">
      <CalendarToolbar
        monthLabel={monthLabel}
        calendarName={calendarName}
        view={view}
        onViewChange={setView}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isNavigating={isNavigating}
        prevMonthParam={prevMonthParam}
        nextMonthParam={nextMonthParam}
        prevWeekMonth={prevWeekMonth}
        prevWeekStart={prevWeekStart}
        nextWeekMonth={nextWeekMonth}
        nextWeekStart={nextWeekStart}
        onGoToMonth={goToMonth}
        onGoToWeek={goToWeek}
      />

      {view === "week" ? (
        <CalendarWeekGrid
          weekTimeGridRef={weekTimeGridRef}
          onWeekGridKeyDown={handleWeekGridKeyDown}
          permissions={permissions}
          currentRankCycle={currentRankCycle}
          weekDays={weekDays}
          localDays={localDays}
          eventsByDate={eventsByDate}
          schedulesByDate={schedulesByDate}
          getCycleForDate={getCycleForDate}
          getBarRoundedInRow={getBarRoundedInRow}
          getPeriodCellClass={getPeriodCellClass}
          formatCycleBandLabel={formatCycleBandLabel}
          saveScheduleAction={saveScheduleAction}
          shiftScheduleAction={shiftScheduleAction}
          deleteScheduleAction={deleteScheduleAction}
          resizeScheduleAction={resizeScheduleAction}
          selectedScheduleId={selectedScheduleId}
          weekSchedulePreviewOpen={weekSchedulePreviewOpen}
          setWeekSchedulePreviewOpen={setWeekSchedulePreviewOpen}
          setSelectedDate={setSelectedDate}
          setSelectedScheduleId={setSelectedScheduleId}
          setIsDayEditModalOpen={setIsDayEditModalOpen}
          setModalTab={setModalTab}
          setScheduleCreatePrefill={setScheduleCreatePrefill}
          setScheduleCreateSelection={setScheduleCreateSelection}
          scheduleCreateSelection={scheduleCreateSelection}
          scheduleCreateSelectionRef={scheduleCreateSelectionRef}
          scheduleDragPreview={scheduleDragPreview}
          setScheduleDragPreview={setScheduleDragPreview}
          scheduleResizePreview={scheduleResizePreview}
          setScheduleResizePreview={setScheduleResizePreview}
          scheduleDragDurationMsRef={scheduleDragDurationMsRef}
          scheduleShiftPendingRef={scheduleShiftPendingRef}
          applyOptimisticScheduleShift={applyOptimisticScheduleShift}
          applyOptimisticSchedulePatch={applyOptimisticSchedulePatch}
          mutateRange={mutateRange}
          showToast={showToast}
        />
      ) : (
        <CalendarMonthGrid
          permissions={permissions}
          viewMode={viewMode}
          streamTimeTotals={streamTimeTotals}
          monthWeeks={monthWeeks}
          todayStr={todayStr}
          eventsByDate={eventsByDate}
          schedulesByDate={schedulesByDate}
          getCycleForDate={getCycleForDate}
          getBarRoundedInRow={getBarRoundedInRow}
          getPeriodCellClass={getPeriodCellClass}
          formatCycleBandLabel={formatCycleBandLabel}
          onMonthDayActivate={(day) => {
            setSelectedDate(day.date);
            if (permissions.canEditSchedule) {
              setIsDayEditModalOpen(true);
              setWeekSchedulePreviewOpen(false);
            }
          }}
          onMoveEntryToDate={handleMoveEntry}
        />
      )}


      {moveError && (
        <div
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {moveError}
        </div>
      )}

      {permissions.canEditSchedule && isDayEditModalOpen && selectedDate && selectedDay && (
        <CalendarDayEditSheet
          sheetEntered={sheetEntered}
          selectedDate={selectedDate}
          selectedDay={selectedDay}
          calendarId={calendarId}
          events={events}
          skipPassRemaining={skipPassRemaining}
          handleSave={handleSave}
          effectiveDefaultEventId={effectiveDefaultEventId}
          modalTab={modalTab}
          setModalTab={setModalTab}
          saveScheduleAction={saveScheduleAction}
          selectedSchedule={selectedSchedule}
          scheduleCreatePrefill={scheduleCreatePrefill}
          selectedSchedules={selectedSchedules}
          selectedScheduleId={selectedScheduleId}
          setSelectedScheduleId={setSelectedScheduleId}
          setScheduleCreatePrefill={setScheduleCreatePrefill}
          permissions={permissions}
          deleteScheduleAction={deleteScheduleAction}
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
