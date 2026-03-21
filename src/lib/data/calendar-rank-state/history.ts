import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RankLabel } from "@/lib/domain/rank";
import type { RankCycleHistoryRow } from "./types";

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
    throwDataLayerError(new Error(
      `calendar_rank_cycle_history select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
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
    throwDataLayerError(new Error(
      `calendar_rank_cycle_history insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    ));
  }
}
