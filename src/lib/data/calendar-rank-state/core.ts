import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import {
  addDays,
  getCycleEndDateIncludingSkips,
  getJstWeekStart,
  toJstDateString,
} from "@/lib/domain/calendar";

import type { CalendarRankStateRow } from "./types";

export async function getCalendarRankState(
  calendarId: string
): Promise<CalendarRankStateRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .select("calendar_id, current_rank, target_rank, rank_cycle_start_date, rank_reset_date, skip_pass_remaining, skip_pass_last_increment_week_start")
    .eq("calendar_id", calendarId)
    .maybeSingle();

  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
  return data as CalendarRankStateRow | null;
}

/**
 * ランク状態を取得し、無ければ「今週月曜〜日曜」で初期レコードを作成して返す。
 */
export async function getOrCreateCalendarRankState(
  calendarId: string
): Promise<CalendarRankStateRow> {
  const existing = await getCalendarRankState(calendarId);
  if (existing) return existing;

  const todayJst = toJstDateString(new Date());
  const weekStart = getJstWeekStart(todayJst);
  const weekEnd = addDays(weekStart, 6);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .insert({
      calendar_id: calendarId,
      current_rank: null,
      target_rank: null,
      rank_cycle_start_date: weekStart,
      rank_reset_date: weekEnd,
      skip_pass_remaining: 0,
      skip_pass_last_increment_week_start: null,
    })
    .select("calendar_id, current_rank, target_rank, rank_cycle_start_date, rank_reset_date, skip_pass_remaining, skip_pass_last_increment_week_start")
    .single();

  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
  return data as CalendarRankStateRow;
}

/**
 * リセット日を 1 日延長する（スキップ使用時）。対象日が周期内の場合のみ。
 */
export async function extendRankResetDate(
  calendarId: string,
  skipDate: string,
  currentCycleStart: string,
  currentResetDate: string
): Promise<void> {
  if (skipDate < currentCycleStart || skipDate > currentResetDate) {
    return;
  }
  const newReset = addDays(currentResetDate, 1);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ rank_reset_date: newReset })
    .eq("calendar_id", calendarId);

  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state update (extend reset) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
}

/**
 * 現在周期のスキップ実績から rank_reset_date を再計算して更新する。
 * スキップ解除（ON→OFF）時の巻き戻しに使用。
 */
export async function recalculateRankResetDateFromCurrentCycle(
  calendarId: string
): Promise<void> {
  const state = await getOrCreateCalendarRankState(calendarId);
  const entries = await getScheduleEntriesInRange(
    calendarId,
    state.rank_cycle_start_date,
    state.rank_reset_date
  );
  const entriesByDate = new Map(
    entries.map((e) => [e.date, { skip_pass_used: e.skip_pass_used }])
  );
  const nextResetDate = getCycleEndDateIncludingSkips(
    state.rank_cycle_start_date,
    entriesByDate
  );
  if (nextResetDate === state.rank_reset_date) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ rank_reset_date: nextResetDate })
    .eq("calendar_id", calendarId);
  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state update (recalculate reset) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
}
