import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { addDays, getCycleEndDateIncludingSkips, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";
import type { RankLabel } from "@/lib/domain/rank";

export type CalendarRankStateRow = {
  calendar_id: string;
  current_rank: RankLabel | null;
  rank_cycle_start_date: string;
  rank_reset_date: string;
  skip_pass_remaining: number;
  skip_pass_last_increment_week_start: string | null;
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
    .select("calendar_id, current_rank, rank_cycle_start_date, rank_reset_date, skip_pass_remaining, skip_pass_last_increment_week_start")
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
      skip_pass_remaining: 0,
      skip_pass_last_increment_week_start: null,
    })
    .select("calendar_id, current_rank, rank_cycle_start_date, rank_reset_date, skip_pass_remaining, skip_pass_last_increment_week_start")
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

const SKIP_PASS_MAX = 10;

export type SkipPassSnapshotRow = { as_of_date: string; remaining: number };

/**
 * スキパ枚数のスナップショットを1件保存（同一日は上書き）。データタブで「その日の枚数」表示用。
 */
export async function insertSkipPassSnapshot(
  calendarId: string,
  asOfDate: string,
  remaining: number
): Promise<void> {
  const value = Math.min(SKIP_PASS_MAX, Math.max(0, Math.floor(remaining)));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("skip_pass_snapshots")
    .upsert(
      { calendar_id: calendarId, as_of_date: asOfDate, remaining: value },
      { onConflict: "calendar_id,as_of_date" }
    );
  if (error) {
    throw new Error(
      `skip_pass_snapshots upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

/**
 * 指定日以前のスナップショットを as_of_date 降順で取得。行ごとの「その日時点の枚数」計算用。
 */
export async function getSkipPassSnapshotsBefore(
  calendarId: string,
  toDate: string
): Promise<SkipPassSnapshotRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("skip_pass_snapshots")
    .select("as_of_date, remaining")
    .eq("calendar_id", calendarId)
    .lte("as_of_date", toDate)
    .order("as_of_date", { ascending: false });
  if (error) {
    throw new Error(
      `skip_pass_snapshots select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return (data ?? []) as SkipPassSnapshotRow[];
}

/**
 * 指定日のスキパ枚数スナップショットを保存。データタブから行ごとに編集する用。
 * asOfDate が今日の場合は calendar_rank_state.skip_pass_remaining も同期する。
 */
export async function setSkipPassSnapshot(
  calendarId: string,
  asOfDate: string,
  remaining: number
): Promise<void> {
  const clamped = Math.min(SKIP_PASS_MAX, Math.max(0, Math.floor(remaining)));
  await insertSkipPassSnapshot(calendarId, asOfDate, clamped);
  const todayJst = toJstDateString(new Date());
  if (asOfDate !== todayJst) return;
  await getOrCreateCalendarRankState(calendarId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ skip_pass_remaining: clamped })
    .eq("calendar_id", calendarId);
  if (error) {
    throw new Error(
      `calendar_rank_state update (skip_pass sync) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

/**
 * 前週に actual_plus >= 1 の日が1日でもあれば、月曜にスキパ+1（上限10）。二重加算防止のため last_increment_week を記録。
 * ランク状態を取得するページ（データタブ等）で呼ぶ。
 */
export async function ensureSkipPassIncrementForLastWeek(
  calendarId: string
): Promise<void> {
  const state = await getOrCreateCalendarRankState(calendarId);
  const todayJst = toJstDateString(new Date());
  const thisWeekMonday = getJstWeekStart(todayJst);
  const prevWeekMonday = addDays(thisWeekMonday, -7);
  const lastIncrement = state.skip_pass_last_increment_week_start ?? "";
  if (lastIncrement >= prevWeekMonday) return;
  const prevWeekEnd = addDays(prevWeekMonday, 6);
  const entries = await getScheduleEntriesInRange(
    calendarId,
    prevWeekMonday,
    prevWeekEnd
  );
  const hadStream = entries.some((e) => (e.actual_plus ?? 0) >= 1);
  if (!hadStream) return;
  const nextRemaining = Math.min(SKIP_PASS_MAX, (state.skip_pass_remaining ?? 0) + 1);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({
      skip_pass_remaining: nextRemaining,
      skip_pass_last_increment_week_start: prevWeekMonday,
    })
    .eq("calendar_id", calendarId);
  if (error) {
    throw new Error(
      `calendar_rank_state update (skip_pass increment) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  await insertSkipPassSnapshot(calendarId, todayJst, nextRemaining);
}

/**
 * スキパを1枚使用したときに残りを1減らす（0未満にはしない）。usedOnDate にその日のスナップショットを保存。
 * 減算の基準は「使用日の前日時点の枚数」なので、データタブで過去日だけスナップショットを編集していても正しく 1 減る。
 */
export async function decrementSkipPassRemaining(
  calendarId: string,
  usedOnDate: string
): Promise<void> {
  const state = await getOrCreateCalendarRankState(calendarId);
  const prevDay = addDays(usedOnDate, -1);
  const snapshotsBefore = await getSkipPassSnapshotsBefore(calendarId, prevDay);
  const remainingBefore =
    snapshotsBefore[0]?.remaining ?? (state.skip_pass_remaining ?? 0);
  const next = Math.max(0, remainingBefore - 1);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ skip_pass_remaining: next })
    .eq("calendar_id", calendarId);
  if (error) {
    throw new Error(
      `calendar_rank_state update (skip_pass decrement) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  await insertSkipPassSnapshot(calendarId, usedOnDate, next);
}

/**
 * データタブからスキパ残り枚数を手動で更新する。0〜10にクランプ。その日のスナップショットを保存。
 */
export async function updateSkipPassRemaining(
  calendarId: string,
  value: number
): Promise<void> {
  await getOrCreateCalendarRankState(calendarId);
  const clamped = Math.min(SKIP_PASS_MAX, Math.max(0, Math.floor(value)));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ skip_pass_remaining: clamped })
    .eq("calendar_id", calendarId);
  if (error) {
    throw new Error(
      `calendar_rank_state update (skip_pass_remaining) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  const todayJst = toJstDateString(new Date());
  await insertSkipPassSnapshot(calendarId, todayJst, clamped);
}

export type RankCycleHistoryRow = {
  id: string;
  calendar_id: string;
  cycle_start_date: string;
  cycle_end_date: string;
  rank_during: RankLabel | null;
};

/**
 * 指定日付範囲と重なるランク周期履歴を取得（カレンダー表示用）。
 */
export async function getRankCycleHistory(
  calendarId: string,
  fromDate: string,
  toDate: string
): Promise<RankCycleHistoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendar_rank_cycle_history")
    .select("id, calendar_id, cycle_start_date, cycle_end_date, rank_during")
    .eq("calendar_id", calendarId)
    .gte("cycle_end_date", fromDate)
    .lte("cycle_start_date", toDate)
    .order("cycle_start_date", { ascending: true });

  if (error) {
    throw new Error(
      `calendar_rank_cycle_history select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return (data ?? []) as RankCycleHistoryRow[];
}

/**
 * 終了したランク周期を履歴に追加（applyRankUp の内部で使用）。
 */
export async function insertRankCycleHistory(
  calendarId: string,
  cycleStartDate: string,
  cycleEndDate: string,
  rankDuring: RankLabel | null
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_cycle_history")
    .insert({
      calendar_id: calendarId,
      cycle_start_date: cycleStartDate,
      cycle_end_date: cycleEndDate,
      rank_during: rankDuring,
    });

  if (error) {
    throw new Error(
      `calendar_rank_cycle_history insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

/**
 * ランクアップを反映: 終了した周期を履歴に保存し、current_rank を1段階上げ、新周期を設定。
 * 新周期の終了日は基準7日間にスキップが N 日あれば +N 日延長する。
 */
export async function applyRankUp(
  calendarId: string,
  rankUpAchievedDate: string,
  currentRank: RankLabel | null
): Promise<void> {
  const { getNextRank } = await import("@/lib/domain/rank");
  const nextRank = getNextRank(currentRank);
  const state = await getOrCreateCalendarRankState(calendarId);
  const cycleStartNew = addDays(rankUpAchievedDate, 1);
  const baseCycleEnd = addDays(cycleStartNew, 6);
  const nextCycleEntries = await getScheduleEntriesInRange(
    calendarId,
    cycleStartNew,
    baseCycleEnd
  );
  const entriesByDate = new Map(
    nextCycleEntries.map((e) => [e.date, { skip_pass_used: e.skip_pass_used }])
  );
  const resetDateNew = getCycleEndDateIncludingSkips(cycleStartNew, entriesByDate);

  await insertRankCycleHistory(
    calendarId,
    state.rank_cycle_start_date,
    rankUpAchievedDate,
    state.current_rank
  );

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
