import { compareJstDate } from "@/lib/domain/calendar";
import {
  decrementSkipPassRemaining,
  extendRankResetDate,
  getOrCreateCalendarRankState,
  recalculateRankResetDateFromCurrentCycle,
  restoreSkipPassRemaining,
} from "@/lib/data/calendar-rank-state";

/**
 * schedule_entries のスキップパス使用フラグが変わったときの calendar_rank_state 更新。
 */
export async function applySkipPassRankSideEffects(
  calendarId: string,
  date: string,
  previousSkipPassUsed: boolean,
  nextSkipPassUsed: boolean
): Promise<void> {
  if (!previousSkipPassUsed && nextSkipPassUsed) {
    const state = await getOrCreateCalendarRankState(calendarId);
    if (
      compareJstDate(date, state.rank_cycle_start_date) >= 0 &&
      compareJstDate(date, state.rank_reset_date) <= 0
    ) {
      await extendRankResetDate(
        calendarId,
        date,
        state.rank_cycle_start_date,
        state.rank_reset_date
      );
    }
    await decrementSkipPassRemaining(calendarId, date);
  } else if (previousSkipPassUsed && !nextSkipPassUsed) {
    await recalculateRankResetDateFromCurrentCycle(calendarId);
    await restoreSkipPassRemaining(calendarId, date);
  }
}
