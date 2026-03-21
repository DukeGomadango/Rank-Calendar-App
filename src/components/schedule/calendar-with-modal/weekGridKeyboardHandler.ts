import type { MutableRefObject } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { KeyedMutator } from "swr";

import type { CalendarScheduleRow } from "@/lib/data/schedules";
import type { CalendarRangeResponse } from "@/lib/hooks/useCalendarRange";

import type { DayData } from "./types";

/**
 * 週ビュー時間グリッド上のキーボードショートカット（Undo/Redo/コピー/切り取り/削除/貼り付け）。
 * テストやフックから呼び出しやすいようロジックのみを集約する。
 */
export type WeekGridKeyboardDeps = {
  view: "month" | "week";
  canEditSchedule: boolean;
  selectedDate: string | null;
  selectedScheduleId: string | null;
  schedulesByDate: Map<string, CalendarScheduleRow[]>;
  weekDays: DayData[];
  undoScheduleAction?: () => Promise<void>;
  redoScheduleAction?: () => Promise<void>;
  deleteScheduleAction?: (scheduleId: string) => Promise<void>;
  shiftScheduleAction?: (
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => Promise<void>;
  mutateRange: KeyedMutator<CalendarRangeResponse>;
  showToast: (message: string) => void;
  setWeekSchedulePreviewOpen: (v: boolean) => void;
  setSelectedScheduleId: (id: string | null) => void;
  scheduleClipboardRef: MutableRefObject<CalendarScheduleRow | null>;
};

export async function runWeekGridKeyboardAction(
  e: ReactKeyboardEvent<HTMLElement>,
  deps: WeekGridKeyboardDeps
): Promise<void> {
  const {
    view,
    canEditSchedule,
    selectedDate,
    selectedScheduleId,
    schedulesByDate,
    weekDays,
    undoScheduleAction,
    redoScheduleAction,
    deleteScheduleAction,
    shiftScheduleAction,
    mutateRange,
    showToast,
    setWeekSchedulePreviewOpen,
    setSelectedScheduleId,
    scheduleClipboardRef,
  } = deps;

  if (view !== "week") return;
  if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
  const mod = e.ctrlKey || e.metaKey;
  if (!canEditSchedule) return;

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
}
