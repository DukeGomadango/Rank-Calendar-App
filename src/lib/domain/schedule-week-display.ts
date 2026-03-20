import type { CalendarScheduleRow } from "@/lib/data/schedules";

function wallHHMM(t: string | null | undefined): string | null {
  if (t == null) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  if (m[1] === "24" && m[2] === "00") return "24:00";
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** 週ビュー上部の終日行に出す（is_all_day または DB 上は timed だが終日相当） */
export function scheduleShowsInWeekAllDayRow(s: CalendarScheduleRow): boolean {
  if (s.is_all_day) return true;
  const st = wallHHMM(s.start_time);
  const et = wallHHMM(s.end_time);
  if (!st || !et) return false;
  if (st !== "00:00") return false;
  return et === "23:59" || et === "24:00";
}

/** 時間グリッドに載せる timed 予定（終日行に回したものは除外） */
export function scheduleShowsInWeekTimeGrid(s: CalendarScheduleRow): boolean {
  if (scheduleShowsInWeekAllDayRow(s)) return false;
  return !!(s.start_time && s.end_time);
}
