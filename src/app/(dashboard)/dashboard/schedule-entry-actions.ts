import { revalidatePath } from "next/cache";

import {
  upsertScheduleEntryForDate,
  getScheduleEntriesInRange,
} from "@/lib/data/schedule-entries";
import {
  getOrCreateCalendarRankState,
  extendRankResetDate,
  recalculateRankResetDateFromCurrentCycle,
  decrementSkipPassRemaining,
  restoreSkipPassRemaining,
  updateSkipPassRemaining as updateSkipPassRemainingState,
  setSkipPassSnapshot,
  ensureSkipPassIncrementForLastWeek,
} from "@/lib/data/calendar-rank-state";
import { compareJstDate } from "@/lib/domain/calendar";
import { MAX_BORDER_VALUE } from "@/lib/border-constants";
import { ensureUserCanEditCalendar } from "@/lib/auth/permission";
import { throwDataLayerError } from "@/lib/errors";
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

  await ensureUserCanEditCalendar(calendarId);
  const [existing] = await getScheduleEntriesInRange(calendarId, date, date);
  const previousSkipPassUsed = existing?.skip_pass_used ?? false;

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

  if (!previousSkipPassUsed && skipPassUsed) {
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
  } else if (previousSkipPassUsed && !skipPassUsed) {
    await recalculateRankResetDateFromCurrentCycle(calendarId);
    await restoreSkipPassRemaining(calendarId, date);
  }

  await ensureSkipPassIncrementForLastWeek(calendarId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
  return { ok: true };
}

export async function moveScheduleEntry(
  calendarId: string,
  fromDate: string,
  toDate: string
) {
  "use server";

  if (!calendarId || !fromDate || !toDate || fromDate === toDate) {
    return;
  }

  await ensureUserCanEditCalendar(calendarId);

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
    // 本番で内部詳細がブラウザ側に漏れないよう、データ層と同様に汎用メッセージへ寄せる
    throwDataLayerError(
      new Error(
        `schedule_entries delete failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
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

  await ensureUserCanEditCalendar(calendarId);

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
    return Number.isNaN(n) ? null : Math.floor(n);
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
  else if (field === "ansuko_baseline") {
    const n = num(value);
    if (n !== null && (n < 0 || n > MAX_BORDER_VALUE)) {
      throw new Error("ansuko_baseline out of range");
    }
    patch.ansuko_baseline = n;
  } else if (field === "border_plus2") {
    const n = num(value);
    if (n !== null && (n < 0 || n > MAX_BORDER_VALUE)) {
      throw new Error("border_plus2 out of range");
    }
    patch.border_plus2 = n;
  } else if (field === "border_plus4") {
    const n = num(value);
    if (n !== null && (n < 0 || n > MAX_BORDER_VALUE)) {
      throw new Error("border_plus4 out of range");
    }
    patch.border_plus4 = n;
  } else if (field === "border_plus6") {
    const n = num(value);
    if (n !== null && (n < 0 || n > MAX_BORDER_VALUE)) {
      throw new Error("border_plus6 out of range");
    }
    patch.border_plus6 = n;
  }
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

  const nextSkipPassUsed =
    field === "skip_pass_used" ? bool(value) : base.skip_pass_used;
  if (field === "skip_pass_used" && !base.skip_pass_used && nextSkipPassUsed) {
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
  } else if (
    field === "skip_pass_used" &&
    base.skip_pass_used &&
    !nextSkipPassUsed
  ) {
    await recalculateRankResetDateFromCurrentCycle(calendarId);
    await restoreSkipPassRemaining(calendarId, date);
  }

  await ensureSkipPassIncrementForLastWeek(calendarId);
}

export async function updateSkipPassRemaining(
  calendarId: string,
  value: number
) {
  "use server";
  await ensureUserCanEditCalendar(calendarId);
  await updateSkipPassRemainingState(calendarId, value);
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
  await ensureUserCanEditCalendar(calendarId);
  await setSkipPassSnapshot(calendarId, asOfDate, value);
}

export async function noopMoveEntry(
  _calendarId: string,
  _fromDate: string,
  _toDate: string
) {
  "use server";
  void _calendarId;
  void _fromDate;
  void _toDate;
}

/**
 * 開発用モック表示用。何もしないサーバーアクション。
 */
export async function noopSaveEntry(_formData: FormData) {
  "use server";
  void _formData;
}

/** 開発用モック表示用。データタブのセル編集で使用。 */
export async function noopUpdateScheduleEntryField(
  _calendarId: string,
  _date: string,
  _field: string,
  _value: string | number | boolean
) {
  "use server";
  void _calendarId;
  void _date;
  void _field;
  void _value;
}
