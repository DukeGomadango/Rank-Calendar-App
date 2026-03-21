import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { addDays, getCycleEndDateIncludingSkips } from "@/lib/domain/calendar";
import type { RankLabel } from "@/lib/domain/rank";

import { getOrCreateCalendarRankState } from "./core";
import { insertRankCycleHistory } from "./history";

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

  /** S3 のとき nextRank は null。ランクは変えず周期のみ更新する。 */
  const newRank = nextRank ?? state.current_rank;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({
      current_rank: newRank,
      rank_cycle_start_date: cycleStartNew,
      rank_reset_date: resetDateNew,
    })
    .eq("calendar_id", calendarId);

  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state applyRankUp failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
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
    throwDataLayerError(new Error(
      `calendar_rank_state update (current_rank) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
}

/**
 * 目標ランクを更新する（オンボーディング・設定用）。
 */
export async function updateTargetRank(
  calendarId: string,
  targetRank: RankLabel | null
): Promise<void> {
  await getOrCreateCalendarRankState(calendarId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendar_rank_state")
    .update({ target_rank: targetRank })
    .eq("calendar_id", calendarId);

  if (error) {
    throwDataLayerError(new Error(
      `calendar_rank_state update (target_rank) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
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
    throwDataLayerError(new Error(
      `calendar_rank_state update (rank_reset_date) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
}
