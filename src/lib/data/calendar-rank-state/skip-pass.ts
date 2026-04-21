import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { addDays, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";

import { getOrCreateCalendarRankState } from "./core";

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
    throwDataLayerError(new Error(
      `skip_pass_snapshots upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
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
    throwDataLayerError(new Error(
      `skip_pass_snapshots select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
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
  const snapshots = await getSkipPassSnapshotsBefore(calendarId, todayJst);
  const latestRemaining = snapshots[0]?.remaining;
  if (latestRemaining == null) return;
  await getOrCreateCalendarRankState(calendarId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ skip_pass_remaining: latestRemaining })
    .eq("calendar_id", calendarId);
  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state update (skip_pass sync) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
}

/**
 * 前週までの未処理週について、actual_plus >= 1 の日が1日でもあれば週ごとにスキパ+1（上限10）。
 * 二重加算防止のため last_increment_week を記録する。
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

  const firstWeekToCheck =
    lastIncrement === "" ? prevWeekMonday : addDays(lastIncrement, 7);

  let weekStart = firstWeekToCheck;
  let nextRemaining = state.skip_pass_remaining ?? 0;
  let latestProcessedWeek = lastIncrement;
  let incremented = false;

  while (weekStart <= prevWeekMonday) {
    const weekEnd = addDays(weekStart, 6);
    const entries = await getScheduleEntriesInRange(
      calendarId,
      weekStart,
      weekEnd
    );
    const hadStream = entries.some((e) => (e.actual_plus ?? 0) >= 1);
    if (hadStream) {
      nextRemaining = Math.min(SKIP_PASS_MAX, nextRemaining + 1);
      incremented = true;
    }
    latestProcessedWeek = weekStart;
    weekStart = addDays(weekStart, 7);
  }

  if (!incremented || latestProcessedWeek === "") return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({
      skip_pass_remaining: nextRemaining,
      skip_pass_last_increment_week_start: latestProcessedWeek,
    })
    .eq("calendar_id", calendarId);
  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state update (skip_pass increment) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
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
    throwDataLayerError(new Error(
      `calendar_rank_state update (skip_pass decrement) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
  await insertSkipPassSnapshot(calendarId, usedOnDate, next);
}

/**
 * スキパ使用を取り消したとき、その日の残り枚数を「前日と同じ値」に戻す。
 * unusedOnDate にその日のスナップショットを保存する。
 */
export async function restoreSkipPassRemaining(
  calendarId: string,
  unusedOnDate: string
): Promise<void> {
  const state = await getOrCreateCalendarRankState(calendarId);
  const prevDay = addDays(unusedOnDate, -1);
  const snapshotsBefore = await getSkipPassSnapshotsBefore(calendarId, prevDay);
  const restored =
    snapshotsBefore[0]?.remaining ?? (state.skip_pass_remaining ?? 0);
  const next = Math.min(SKIP_PASS_MAX, Math.max(0, restored));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ skip_pass_remaining: next })
    .eq("calendar_id", calendarId);
  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state update (skip_pass restore) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
  await insertSkipPassSnapshot(calendarId, unusedOnDate, next);
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
    throwDataLayerError(new Error(
      `calendar_rank_state update (skip_pass_remaining) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
  const todayJst = toJstDateString(new Date());
  await insertSkipPassSnapshot(calendarId, todayJst, clamped);
}
