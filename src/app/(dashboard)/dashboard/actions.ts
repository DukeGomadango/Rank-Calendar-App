import { revalidatePath } from "next/cache";

import { upsertScheduleEntryForDate } from "@/lib/data/schedule-entries";

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

