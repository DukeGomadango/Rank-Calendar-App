"use server";

import { revalidatePath } from "next/cache";

import { ensureUserCanEditCalendar } from "@/lib/auth/permission";

export async function noopApplyRankUp(_calendarId: string) {
  "use server";
  void _calendarId;
}

/** 開発用モック表示用。ランク変更は何もしない。 */
export async function noopUpdateCurrentRank(
  _calendarId: string,
  _newRank: string | null
) {
  "use server";
  void _calendarId;
  void _newRank;
}

/** 開発用モック表示用。リセット日変更は何もしない。 */
export async function noopUpdateRankResetDate(
  _calendarId: string,
  _newResetDate: string
) {
  "use server";
  void _calendarId;
  void _newResetDate;
}

export async function applyRankUp(calendarId: string) {
  "use server";

  await ensureUserCanEditCalendar(calendarId);

  const { getOrCreateCalendarRankState, applyRankUp: applyRankUpState } = await import(
    "@/lib/data/calendar-rank-state"
  );
  const { getScheduleEntriesInRange } = await import("@/lib/data/schedule-entries");
  const { findRankUpAchievedDateInCycle } = await import("@/lib/domain/rank-simulation");

  const state = await getOrCreateCalendarRankState(calendarId);
  const entries = await getScheduleEntriesInRange(
    calendarId,
    state.rank_cycle_start_date,
    state.rank_reset_date,
  );
  const achievedDate = findRankUpAchievedDateInCycle(
    entries.map((e) => ({
      date: e.date,
      actual_plus: e.actual_plus,
      skip_pass_used: e.skip_pass_used,
    })),
    state.rank_cycle_start_date,
    state.rank_reset_date,
  );

  if (!achievedDate) {
    return;
  }

  await applyRankUpState(calendarId, achievedDate, state.current_rank);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
}

/**
 * 現在ランクを手動で更新する（ランク変更UI用）。
 */
export async function updateCurrentRank(
  calendarId: string,
  newRank: string | null
) {
  "use server";

  await ensureUserCanEditCalendar(calendarId);

  const { updateCurrentRank: updateRankState } = await import(
    "@/lib/data/calendar-rank-state"
  );
  const { RANK_ORDER } = await import("@/lib/domain/rank");
  const validRank =
    newRank && RANK_ORDER.includes(newRank as (typeof RANK_ORDER)[number])
      ? (newRank as (typeof RANK_ORDER)[number])
      : null;
  await updateRankState(calendarId, validRank);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
  revalidatePath("/dashboard/settings");
}

/**
 * 集計周期のリセット日を手動で設定する（IRIAM の実際の周期に合わせる用）。
 */
export async function updateRankResetDate(
  calendarId: string,
  newResetDate: string
) {
  "use server";

  await ensureUserCanEditCalendar(calendarId);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newResetDate)) {
    return;
  }
  const { updateRankResetDate: updateResetState } = await import(
    "@/lib/data/calendar-rank-state"
  );
  await updateResetState(calendarId, newResetDate);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
  revalidatePath("/dashboard/settings");
}
