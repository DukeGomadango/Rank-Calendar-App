import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ScheduleEntryUpsertInput = {
  date: string; // YYYY-MM-DD (JST 想定)
  ansuko_baseline: number | null;
  border_plus2: number | null;
  border_plus4: number | null;
  border_plus6: number | null;
  event_id: string | null;
  memo: string | null;
  target_plus: number | null;
  actual_plus: number | null;
  skip_pass_used: boolean;
  stream_content: string | null;
  stream_content_color: string | null;
};

export async function upsertScheduleEntryForDate(
  calendarId: string,
  input: ScheduleEntryUpsertInput
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("iriam")
    .from("schedule_entries")
    .upsert(
      {
        calendar_id: calendarId,
        date: input.date,
        ansuko_baseline: input.ansuko_baseline,
        border_plus2: input.border_plus2,
        border_plus4: input.border_plus4,
        border_plus6: input.border_plus6,
        event_id: input.event_id,
        memo: input.memo,
        target_plus: input.target_plus,
        actual_plus: input.actual_plus,
        skip_pass_used: input.skip_pass_used,
        stream_content: input.stream_content ?? null,
        stream_content_color: input.stream_content_color ?? null,
      },
      {
        onConflict: "calendar_id,date",
      }
    )
    .select("id, date, border_plus2, border_plus4, border_plus6, event_id, target_plus, actual_plus, skip_pass_used, stream_content, stream_content_color")
    .single();

  if (error) {
    throwDataLayerError(
      new Error(
        `schedule_entries upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }

  return data;
}

export type ScheduleEntryRow = {
  id: string;
  date: string; // YYYY-MM-DD
  ansuko_baseline: number | null;
  border_plus2: number | null;
  border_plus4: number | null;
  border_plus6: number | null;
  event_id: string | null;
  memo: string | null;
  target_plus: number | null;
  actual_plus: number | null;
  skip_pass_used: boolean;
  stream_content: string | null;
  stream_content_color: string | null;
};

export async function getScheduleEntriesInRange(
  calendarId: string,
  fromDate: string,
  toDate: string
): Promise<ScheduleEntryRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("iriam")
    .from("schedule_entries")
    .select(
      "id, date, ansuko_baseline, border_plus2, border_plus4, border_plus6, event_id, memo, target_plus, actual_plus, skip_pass_used, stream_content, stream_content_color"
    )
    .eq("calendar_id", calendarId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date", { ascending: true });

  if (error) {
    throwDataLayerError(
      new Error(
        `schedule_entries select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }

  return (data ?? []) as ScheduleEntryRow[];
}

