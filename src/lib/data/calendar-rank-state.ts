import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDays, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";
import type { RankLabel } from "@/lib/domain/rank";

export type CalendarRankStateRow = {
  calendar_id: string;
  current_rank: RankLabel | null;
  rank_cycle_start_date: string;
  rank_reset_date: string;
};

/**
 * カレンダーのランク状態を取得。無い場合は null（呼び出し側でフォールバック）。
 */
export async function getCalendarRankState(
  calendarId: string
): Promise<CalendarRankStateRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .select("calendar_id, current_rank, rank_cycle_start_date, rank_reset_date")
    .eq("calendar_id", calendarId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `calendar_rank_state select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
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
      rank_cycle_start_date: weekStart,
      rank_reset_date: weekEnd,
    })
    .select("calendar_id, current_rank, rank_cycle_start_date, rank_reset_date")
    .single();

  if (error) {
    throw new Error(
      `calendar_rank_state insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
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
    throw new Error(
      `calendar_rank_state update (extend reset) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

/**
 * ランクアップを反映: current_rank を1段階上げ、新周期（翌日〜翌+6日）を設定。
 * レコードが無い場合は getOrCreate で作成してから更新する。
 */
export async function applyRankUp(
  calendarId: string,
  rankUpAchievedDate: string,
  currentRank: RankLabel | null
): Promise<void> {
  const { getNextRank } = await import("@/lib/domain/rank");
  const nextRank = getNextRank(currentRank);
  const cycleStartNew = addDays(rankUpAchievedDate, 1);
  const resetDateNew = addDays(cycleStartNew, 6);

  await getOrCreateCalendarRankState(calendarId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({
      current_rank: nextRank,
      rank_cycle_start_date: cycleStartNew,
      rank_reset_date: resetDateNew,
    })
    .eq("calendar_id", calendarId);

  if (error) {
    throw new Error(
      `calendar_rank_state applyRankUp failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

/**
 * 現在ランクを手動で更新する（ランク変更UI用）。レコードが無い場合は getOrCreate で作成してから更新。
 */
export async function updateCurrentRank(
  calendarId: string,
  newRank: RankLabel | null
): Promise<void> {
  await getOrCreateCalendarRankState(calendarId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ current_rank: newRank })
    .eq("calendar_id", calendarId);

  if (error) {
    throw new Error(
      `calendar_rank_state update (current_rank) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

/**
 * リセット日を手動で設定する（IRIAM の実際の周期に合わせる用）。
 * 周期開始日は resetDate - 6 日として 7 日周期を維持する。
 */
export async function updateRankResetDate(
  calendarId: string,
  newResetDate: string
): Promise<void> {
  await getOrCreateCalendarRankState(calendarId);
  const cycleStart = addDays(newResetDate, -6);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({
      rank_cycle_start_date: cycleStart,
      rank_reset_date: newResetDate,
    })
    .eq("calendar_id", calendarId);

  if (error) {
    throw new Error(
      `calendar_rank_state update (rank_reset_date) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}
