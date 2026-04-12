import type { CalendarScheduleRow } from "@/lib/data/schedules";

/** 月ビュー・週ビュー共通: スケジュール行の左に並べる時刻ラベル */
export function formatScheduleTimeRangeLabel(s: CalendarScheduleRow): string {
  if (s.is_all_day) return "終日";
  if (s.start_time && s.end_time) {
    return `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`;
  }
  if (s.start_time) return s.start_time.slice(0, 5);
  return "--:--";
}

/** 月セルに列挙するスケジュール（権限は schedulesByDate 側で済ませている前提） */
export function filterSchedulesForMonthCell(
  daySchedules: CalendarScheduleRow[]
): CalendarScheduleRow[] {
  return daySchedules.filter((x) => {
    const k = x.kind;
    return k === null || k === "stream" || k === "personal" || k === "secret";
  });
}

/** 目標と実績を並べて表示する用（目標ラベル＋実績ラベル、実績は達成/未達で色分け） */
export function getTargetActualDisplay(
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
      targetClass:
        "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400" +
        futureBorder,
      actualLabel: "—",
      actualClass: neutralClass,
    };
  }
  const targetLabel = t !== null ? `+${t}` : "—";
  const actualVal = a ?? 0;
  const actualLabel = t !== null ? `+${actualVal}` : a !== null ? `+${a}` : "—";
  const achievedClass =
    "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200";
  const notAchievedClass =
    "rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-700/60 dark:text-zinc-400" +
    futureBorder;
  const actualClass =
    t === null ? neutralClass : actualVal >= (t ?? 0) ? achievedClass : notAchievedClass;
  return {
    targetLabel,
    targetClass:
      t !== null
        ? neutralClass
        : "rounded-full bg-zinc-100/80 px-1.5 py-0.5 text-[9px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
    actualLabel,
    actualClass,
  };
}

/** スキップ日: 薄い緑（休み・集計外。達成バッジの緑と区別するため teal 系） */
export const SKIP_STRIPE_CLASS = "bg-teal-50 dark:bg-teal-950/60";

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 日付が周期範囲内か判定 */
export function dateInCycle(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/** 周期の種別（過去/現在/未来） */
export type PeriodType = "past" | "current" | "future";

export function getPeriodType(
  cycleStart: string,
  cycleEnd: string,
  today: string
): PeriodType {
  if (cycleEnd < today) return "past";
  if (cycleStart <= today && today <= cycleEnd) return "current";
  return "future";
}

export function formatMinutesAsHoursMinutes(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}時間${r}分` : `${r}分`;
}
