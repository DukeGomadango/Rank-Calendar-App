import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import type { CalendarScheduleRow } from "@/lib/data/schedules";

import { runWeekGridKeyboardAction } from "./weekGridKeyboardHandler";
import type { DayData } from "./types";

function mockKeyEvent(
  key: string,
  opts: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
): KeyboardEvent<HTMLElement> {
  const preventDefault = vi.fn();
  return {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    preventDefault,
    target: document.createElement("div"),
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe("runWeekGridKeyboardAction", () => {
  it("月ビューでは何もしない", async () => {
    const mutateRange = vi.fn();
    const e = mockKeyEvent("z", { ctrlKey: true });
    await runWeekGridKeyboardAction(e, {
      view: "month",
      canEditSchedule: true,
      selectedDate: "2025-01-01",
      selectedScheduleId: "s1",
      schedulesByDate: new Map(),
      weekDays: [] as DayData[],
      mutateRange,
      showToast: vi.fn(),
      setWeekSchedulePreviewOpen: vi.fn(),
      setSelectedScheduleId: vi.fn(),
      scheduleClipboardRef: { current: null },
    });
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(mutateRange).not.toHaveBeenCalled();
  });

  it("Ctrl+Z で undo を呼ぶ", async () => {
    const undo = vi.fn().mockResolvedValue(undefined);
    const mutateRange = vi.fn();
    const e = mockKeyEvent("z", { ctrlKey: true });
    await runWeekGridKeyboardAction(e, {
      view: "week",
      canEditSchedule: true,
      selectedDate: null,
      selectedScheduleId: null,
      schedulesByDate: new Map(),
      weekDays: [] as DayData[],
      undoScheduleAction: undo,
      mutateRange,
      showToast: vi.fn(),
      setWeekSchedulePreviewOpen: vi.fn(),
      setSelectedScheduleId: vi.fn(),
      scheduleClipboardRef: { current: null },
    });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(undo).toHaveBeenCalled();
    expect(mutateRange).toHaveBeenCalled();
  });

  it("Ctrl+C でクリップボードに選択中の予定を入れる", async () => {
    const row: CalendarScheduleRow = {
      id: "sch-1",
      calendar_id: "cal",
      date: "2025-01-01",
      end_date: null,
      is_all_day: false,
      start_time: "10:00:00",
      end_time: "11:00:00",
      title: "t",
      kind: null,
      visibility: null,
      color_id: null,
      memo: null,
      created_at: "",
    };
    const ref = { current: null as CalendarScheduleRow | null };
    const e = mockKeyEvent("c", { ctrlKey: true });
    await runWeekGridKeyboardAction(e, {
      view: "week",
      canEditSchedule: true,
      selectedDate: "2025-01-01",
      selectedScheduleId: "sch-1",
      schedulesByDate: new Map([["2025-01-01", [row]]]),
      weekDays: [] as DayData[],
      mutateRange: vi.fn(),
      showToast: vi.fn(),
      setWeekSchedulePreviewOpen: vi.fn(),
      setSelectedScheduleId: vi.fn(),
      scheduleClipboardRef: ref,
    });
    expect(ref.current).toBe(row);
    expect(e.preventDefault).toHaveBeenCalled();
  });
});
