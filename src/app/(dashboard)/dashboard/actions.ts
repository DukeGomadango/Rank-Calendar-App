import { revalidatePath } from "next/cache";

import {
  upsertScheduleEntryForDate,
  getScheduleEntriesInRange,
} from "@/lib/data/schedule-entries";
import {
  getOrCreateCalendarRankState,
  extendRankResetDate,
} from "@/lib/data/calendar-rank-state";
import { compareJstDate } from "@/lib/domain/calendar";

export async function saveScheduleEntry(formData: FormData) {
  "use server";

  const calendarId = formData.get("calendar_id");
  const date = formData.get("date");

  if (typeof calendarId !== "string" || typeof date !== "string") {
    throw new Error("カレンダーIDまたは日付が不正です。");
  }

  const parseNumber = (value: FormDataEntryValue | null): number | null => {
    if (typeof value !== "string" || value.trim() === "") return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const border2 = parseNumber(formData.get("border_plus2"));
  const border4 = parseNumber(formData.get("border_plus4"));
  const border6 = parseNumber(formData.get("border_plus6"));
  const targetPlus = parseNumber(formData.get("target_plus"));
  const actualPlus = parseNumber(formData.get("actual_plus"));
  const memo = formData.get("memo");
  const skipPassUsed = formData.get("skip_pass_used") === "on";
  const eventIdRaw = formData.get("event_id");
  const eventId =
    typeof eventIdRaw === "string" && eventIdRaw.trim() !== ""
      ? eventIdRaw
      : null;

  await upsertScheduleEntryForDate(calendarId, {
    date,
    border_plus2: border2,
    border_plus4: border4,
    border_plus6: border6,
    event_id: eventId,
    memo: typeof memo === "string" && memo.trim() !== "" ? memo : null,
    target_plus: targetPlus,
    actual_plus: actualPlus,
    skip_pass_used: skipPassUsed,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
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
    border_plus2: existing.border_plus2,
    border_plus4: existing.border_plus4,
    border_plus6: existing.border_plus6,
    event_id: existing.event_id,
    memo: null,
    target_plus: existing.target_plus,
    actual_plus: existing.actual_plus,
    skip_pass_used: existing.skip_pass_used,
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
    border_plus2: existing?.border_plus2 ?? null,
    border_plus4: existing?.border_plus4 ?? null,
    border_plus6: existing?.border_plus6 ?? null,
    event_id: existing?.event_id ?? null,
    memo: existing?.memo ?? null,
    target_plus: existing?.target_plus ?? null,
    actual_plus: existing?.actual_plus ?? null,
    skip_pass_used: existing?.skip_pass_used ?? false,
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
    border_plus2: asNumOrNull(patch.border_plus2) ?? base.border_plus2 ?? null,
    border_plus4: asNumOrNull(patch.border_plus4) ?? base.border_plus4 ?? null,
    border_plus6: asNumOrNull(patch.border_plus6) ?? base.border_plus6 ?? null,
    event_id: base.event_id ?? null,
    memo: memoValue,
    target_plus: asNumOrNull(patch.target_plus) ?? base.target_plus ?? null,
    actual_plus: asNumOrNull(patch.actual_plus) ?? base.actual_plus ?? null,
    skip_pass_used: field === "skip_pass_used" ? bool(value) : base.skip_pass_used,
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
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
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

