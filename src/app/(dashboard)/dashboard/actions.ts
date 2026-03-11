import { revalidatePath } from "next/cache";

import {
  upsertScheduleEntryForDate,
  getScheduleEntriesInRange,
} from "@/lib/data/schedule-entries";

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
}

