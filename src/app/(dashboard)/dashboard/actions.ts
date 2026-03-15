import { revalidatePath } from "next/cache";

import {
  upsertScheduleEntryForDate,
  getScheduleEntriesInRange,
} from "@/lib/data/schedule-entries";
import {
  getOrCreateCalendarRankState,
  extendRankResetDate,
  decrementSkipPassRemaining,
  updateSkipPassRemaining as updateSkipPassRemainingState,
  setSkipPassSnapshot,
  ensureSkipPassIncrementForLastWeek,
} from "@/lib/data/calendar-rank-state";
import { compareJstDate } from "@/lib/domain/calendar";
import {
  saveScheduleEntrySchema,
  type SaveScheduleEntryResult,
} from "@/lib/validations/schedule";

export async function saveScheduleEntry(
  formData: FormData
): Promise<SaveScheduleEntryResult> {
  "use server";

  const raw = Object.fromEntries(
    Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? v.name : v])
  );
  const parsed = saveScheduleEntrySchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [path, messages] of Object.entries(
      parsed.error.flatten().fieldErrors
    )) {
      if (messages) fieldErrors[path] = Array.isArray(messages) ? messages : [messages];
    }
    return { ok: false, errors: fieldErrors };
  }

  const {
    calendar_id: calendarId,
    date,
    ansuko_baseline: ansukoBaseline,
    border_plus2: border2,
    border_plus4: border4,
    border_plus6: border6,
    target_plus: targetPlus,
    actual_plus: actualPlus,
    skip_pass_used: skipPassUsed,
    memo,
    event_id: eventId,
    stream_content: streamContent,
    stream_content_color: streamContentColor,
  } = parsed.data;

  await upsertScheduleEntryForDate(calendarId, {
    date,
    ansuko_baseline: ansukoBaseline,
    border_plus2: border2,
    border_plus4: border4,
    border_plus6: border6,
    event_id: eventId,
    memo,
    target_plus: targetPlus,
    actual_plus: actualPlus,
    skip_pass_used: skipPassUsed,
    stream_content: streamContent,
    stream_content_color: streamContentColor,
  });

  if (skipPassUsed) {
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
  }

  await ensureSkipPassIncrementForLastWeek(calendarId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
  return { ok: true };
}

/**
 * スケジュールを別の日付へ移動する（PCカレンダーのドラッグ&ドロップ用）。
 * calendar_id + date で 1 行だけ持つ前提で、fromDate の1件を toDate へコピーし、元を削除する。
 */
export async function moveScheduleEntry(
  calendarId: string,
  fromDate: string,
  toDate: string
) {
  "use server";

  if (!calendarId || !fromDate || !toDate || fromDate === toDate) {
    return;
  }

  const [existing] = await getScheduleEntriesInRange(
    calendarId,
    fromDate,
    fromDate
  );

  if (!existing) {
    return;
  }

  await upsertScheduleEntryForDate(calendarId, {
    date: toDate,
    ansuko_baseline: existing.ansuko_baseline,
    border_plus2: existing.border_plus2,
    border_plus4: existing.border_plus4,
    border_plus6: existing.border_plus6,
    event_id: existing.event_id,
    memo: null,
    target_plus: existing.target_plus,
    actual_plus: existing.actual_plus,
    skip_pass_used: existing.skip_pass_used,
    stream_content: existing.stream_content ?? null,
    stream_content_color: existing.stream_content_color ?? null,
  });

  const supabase = await (await import("@/lib/supabase/server"))
    .createSupabaseServerClient();

  const { error } = await supabase
    .schema("iriam")
    .from("schedule_entries")
    .delete()
    .eq("calendar_id", calendarId)
    .eq("date", fromDate);

  if (error) {
    throw new Error(
      `schedule_entries delete failed: ${error.message ?? ""} (code=${
        error.code ?? "unknown"
      })`
    );
  }

  await ensureSkipPassIncrementForLastWeek(calendarId);

  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
}

/**
 * データタブから1セル編集したときに呼ぶ。該当日の既存データに1フィールドだけマージして upsert する。
 */
export async function updateScheduleEntryField(
  calendarId: string,
  date: string,
  field: string,
  value: string | number | boolean
) {
  "use server";

  const [existing] = await getScheduleEntriesInRange(calendarId, date, date);
  const base = {
    date,
    ansuko_baseline: existing?.ansuko_baseline ?? null,
    border_plus2: existing?.border_plus2 ?? null,
    border_plus4: existing?.border_plus4 ?? null,
    border_plus6: existing?.border_plus6 ?? null,
    event_id: existing?.event_id ?? null,
    memo: existing?.memo ?? null,
    target_plus: existing?.target_plus ?? null,
    actual_plus: existing?.actual_plus ?? null,
    skip_pass_used: existing?.skip_pass_used ?? false,
    stream_content: existing?.stream_content ?? null,
    stream_content_color: existing?.stream_content_color ?? null,
  };

  const num = (v: string | number | boolean): number | null => {
    if (typeof v === "number") return Number.isNaN(v) ? null : v;
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const bool = (v: string | number | boolean): boolean =>
    v === true || v === "on" || v === "true" || v === 1;

  const asNumOrNull = (
    v: number | null | boolean | string | undefined
  ): number | null => (typeof v === "number" ? v : null);

  const patch: Record<
    string,
    number | null | boolean | string | undefined
  > = {};
  if (field === "target_plus") patch.target_plus = num(value);
  else if (field === "actual_plus") patch.actual_plus = num(value);
  else if (field === "ansuko_baseline") patch.ansuko_baseline = num(value);
  else if (field === "border_plus2") patch.border_plus2 = num(value);
  else if (field === "border_plus4") patch.border_plus4 = num(value);
  else if (field === "border_plus6") patch.border_plus6 = num(value);
  else if (field === "skip_pass_used") patch.skip_pass_used = bool(value);
  else if (field === "memo")
    patch.memo =
      typeof value === "string" ? (value.trim() || null) : null;
  else return;

  const memoValue =
    field === "memo" && typeof patch.memo === "string"
      ? patch.memo
      : field === "memo" && patch.memo === null
        ? null
        : base.memo ?? null;

  await upsertScheduleEntryForDate(calendarId, {
    date,
    ansuko_baseline: asNumOrNull(patch.ansuko_baseline) ?? base.ansuko_baseline ?? null,
    border_plus2: asNumOrNull(patch.border_plus2) ?? base.border_plus2 ?? null,
    border_plus4: asNumOrNull(patch.border_plus4) ?? base.border_plus4 ?? null,
    border_plus6: asNumOrNull(patch.border_plus6) ?? base.border_plus6 ?? null,
    event_id: base.event_id ?? null,
    memo: memoValue,
    target_plus: asNumOrNull(patch.target_plus) ?? base.target_plus ?? null,
    actual_plus: asNumOrNull(patch.actual_plus) ?? base.actual_plus ?? null,
    skip_pass_used: field === "skip_pass_used" ? bool(value) : base.skip_pass_used,
    stream_content: base.stream_content ?? null,
    stream_content_color: base.stream_content_color ?? null,
  });

  if (field === "skip_pass_used" && bool(value)) {
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
  }

  await ensureSkipPassIncrementForLastWeek(calendarId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
}

/**
 * データタブからスキパ残り枚数を手動更新する。0〜10にクランプ。
 */
export async function updateSkipPassRemaining(
  calendarId: string,
  value: number
) {
  "use server";
  await updateSkipPassRemainingState(calendarId, value);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/data");
}

/**
 * データタブから指定日のスキパ枚数スナップショットを編集する。
 */
export async function updateSkipPassSnapshot(
  calendarId: string,
  asOfDate: string,
  value: number
) {
  "use server";
  await setSkipPassSnapshot(calendarId, asOfDate, value);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/data");
}

/**
 * 開発用モック表示用。何もしないサーバーアクション。
 */
export async function noopMoveEntry(
  _calendarId: string,
  _fromDate: string,
  _toDate: string
) {
  "use server";
}

/**
 * 開発用モック表示用。何もしないサーバーアクション。
 */
export async function noopSaveEntry(_formData: FormData) {
  "use server";
}

/** 開発用モック表示用。データタブのセル編集で使用。 */
export async function noopUpdateScheduleEntryField(
  _calendarId: string,
  _date: string,
  _field: string,
  _value: string | number | boolean
) {
  "use server";
}

/** 開発用モック表示用。ランクアップ・ランク変更は何もしない。 */
export async function noopApplyRankUp(_calendarId: string) {
  "use server";
}

/** 開発用モック表示用。ランク変更は何もしない。 */
export async function noopUpdateCurrentRank(
  _calendarId: string,
  _newRank: string | null
) {
  "use server";
}

/** 開発用モック表示用。リセット日変更は何もしない。 */
export async function noopUpdateRankResetDate(
  _calendarId: string,
  _newResetDate: string
) {
  "use server";
}

/**
 * ランクアップを反映: current_rank を1段階上げ、新周期（翌日〜翌+6日）を設定。
 */
export async function applyRankUp(calendarId: string) {
  "use server";

  const { getOrCreateCalendarRankState, applyRankUp: applyRankUpState } = await import(
    "@/lib/data/calendar-rank-state"
  );
  const { toJstDateString } = await import("@/lib/domain/calendar");
  const state = await getOrCreateCalendarRankState(calendarId);
  const todayJst = toJstDateString(new Date());
  await applyRankUpState(calendarId, todayJst, state.current_rank);
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

