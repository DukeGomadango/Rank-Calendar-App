import dayjs from "dayjs";

import type { CalendarScheduleRow } from "@/lib/data/schedules";
import {
  MINUTES_PER_DAY,
  snapMinutesToSlot,
  WEEK_VIEW_SLOT_MINUTES,
} from "@/lib/domain/week-view-layout";

export type WeekGridTimeHelpers = {
  parseYMD: (d: string) => { y: number; mo: number; da: number };
  wallClockHHMM: (t: string | null | undefined) => string | null;
  parseHHMM: (hhmm: string) => { hh: number; mm: number };
  toUtcMs: (dateStr: string, timeStr: string) => number;
  formatHHMMFromUtcMs: (ms: number) => string;
  formatYMDFromUtcMs: (ms: number) => string;
  pointerYToSnappedMinutes: (rect: DOMRect, clientY: number) => number;
  snapDeltaMinutesFromDrag: (rect: DOMRect, deltaY: number) => number;
  getScheduleSpanMs: (
    s: CalendarScheduleRow
  ) => { startMs: number; endMs: number } | null;
};

export function createWeekGridTimeHelpers(
  totalMinutes: number
): WeekGridTimeHelpers {
  const parseYMD = (d: string): { y: number; mo: number; da: number } => {
    const [y, mo, da] = d.split("-").map((v) => Number(v));
    return { y, mo, da };
  };

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
    const mi = String(dt.getUTCMinutes()).padStart(2, "0");
    return `${h}:${mi}`;
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

  return {
    parseYMD,
    wallClockHHMM,
    parseHHMM,
    toUtcMs,
    formatHHMMFromUtcMs,
    formatYMDFromUtcMs,
    pointerYToSnappedMinutes,
    snapDeltaMinutesFromDrag,
    getScheduleSpanMs,
  };
}
