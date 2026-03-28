import { addDays, getJstWeekStart, type JstDateString } from "./calendar";

const SKIP_PASS_MAX = 10;

export type EntryForPrediction = {
  target_plus?: number | null;
  actual_plus?: number | null;
  skip_pass_used?: boolean;
};

/**
 * 未来日のスキパ枚数を予測する。
 * baseRemaining は fromDate の前日終了時点の枚数。fromDate 〜 toDate を日付順にシミュレートし、
 * 月曜は「前週に1日でも配信」なら+1（過去日は actual_plus、未来日は target_plus で判定）、
 * その日にスキパ使用予定なら-1。toDate 終了時点の枚数を返す。
 */
export function getPredictedSkipPassRemaining(
  baseRemaining: number,
  fromDate: JstDateString,
  toDate: JstDateString,
  entriesByDate: Map<string, EntryForPrediction>,
  today: JstDateString
): number {
  let remaining = Math.max(0, Math.min(SKIP_PASS_MAX, baseRemaining));
  let d = fromDate;
  while (d <= toDate) {
    const isMonday = d === getJstWeekStart(d);
    if (isMonday) {
      const prevWeekStart = addDays(d, -7);
      const prevWeekEnd = addDays(d, -1);
      let hadStream = false;
      let cursor = prevWeekStart;
      while (cursor <= prevWeekEnd) {
        const entry = entriesByDate.get(cursor);
        const plus =
          cursor < today
            ? (entry?.actual_plus ?? 0)
            : entry?.actual_plus != null
              ? Math.max(0, entry.actual_plus)
              : Math.max(0, entry?.target_plus ?? 0);
        if (plus >= 1) {
          hadStream = true;
          break;
        }
        cursor = addDays(cursor, 1);
      }
      if (hadStream) {
        remaining = Math.min(SKIP_PASS_MAX, remaining + 1);
      }
    }
    const entry = entriesByDate.get(d);
    if (entry?.skip_pass_used) {
      remaining = Math.max(0, remaining - 1);
    }
    d = addDays(d, 1);
  }
  return remaining;
}
