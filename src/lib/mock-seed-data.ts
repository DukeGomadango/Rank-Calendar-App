import dayjs from "dayjs";
import { addDays, getJstWeekStart } from "@/lib/domain/calendar";
import type { MockEntry } from "@/lib/mock-schedule-context";

/** 維持用: 基本+1、+6は水曜（index 2）、土曜スキップ。合計12。月〜日。 */
const KEEP_PLUS = [1, 1, 6, 1, 1, 2, 0] as const;
const KEEP_SKIP_INDEX = 5; // 土曜をスキップ

/** 今週のA2ランクアップ狙い: 水・木で+6二回、他+2で合計18、土曜スキップ。 */
const RANK_UP_PLUS = [2, 2, 6, 6, 2, 0, 0] as const;
const RANK_UP_SKIP_INDEX = 5;

/**
 * 開発用モックのシードデータを生成する。
 * 設定: 現在A1、今週のみ+18でA2狙い（水・木で+6二回）、前後1ヶ月は維持（+1中心・水曜+6・スキップ）。
 * @param todayStr 今日の日付 YYYY-MM-DD（JST）。省略時は実行時の今日。
 */
export function getMockSeedEntries(todayStr?: string): Record<string, MockEntry> {
  const today = todayStr ?? dayjs().format("YYYY-MM-DD");
  const cycleStart = getJstWeekStart(today);
  const cycleEnd = addDays(cycleStart, 6);

  const result: Record<string, MockEntry> = {};
  const start = dayjs(today).subtract(31, "day").format("YYYY-MM-DD");
  const end = dayjs(today).add(31, "day").format("YYYY-MM-DD");

  let cursor = start;
  while (cursor <= end) {
    const weekStart = getJstWeekStart(cursor);
    const weekEnd = addDays(weekStart, 6);
    const indexInWeek = dayjs(cursor).diff(dayjs(weekStart), "day");
    const isCurrentWeek = weekStart === cycleStart;
    const isPast = cursor < today;
    const isPastWeek = weekEnd < today;

    let plus: number;
    let skip: boolean;

    if (isCurrentWeek) {
      plus = RANK_UP_PLUS[indexInWeek] ?? 0;
      skip = indexInWeek === RANK_UP_SKIP_INDEX;
    } else {
      plus = KEEP_PLUS[indexInWeek] ?? 0;
      skip = indexInWeek === KEEP_SKIP_INDEX;
    }

    const hasActual = isPastWeek || (isCurrentWeek && isPast);
    result[cursor] = {
      date: cursor,
      target_plus: plus,
      actual_plus: hasActual && !skip ? plus : null,
      skip_pass_used: skip,
    };

    cursor = dayjs(cursor).add(1, "day").format("YYYY-MM-DD");
  }

  return result;
}
