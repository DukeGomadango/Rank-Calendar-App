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

export type GetScheduleEntriesInRangeOptions = {
  includeBorders?: boolean;
  includeMemo?: boolean;
  /**
   * listener の「今日の予定」などに使うテキスト（長文になりがち）
   * 色ドットは `stream_content_color` のみでも表現できるため、色は常に返す前提。
   */
  includeStreamContent?: boolean;
};

export async function getScheduleEntriesInRange(
  calendarId: string,
  fromDate: string,
  toDate: string,
  options: GetScheduleEntriesInRangeOptions = {}
): Promise<ScheduleEntryRow[]> {
  const {
    includeBorders = true,
    includeMemo = true,
    includeStreamContent = true,
  } = options;

  const supabase = await createSupabaseServerClient();

  const columns = [
    "id",
    "date",
    // 編集/表示に必要
    "event_id",
    "target_plus",
    "actual_plus",
    "skip_pass_used",
    // 色ドット用（テキストは permissions に応じて）
    "stream_content_color",
  ];
  if (includeBorders) {
    columns.push("ansuko_baseline", "border_plus2", "border_plus4", "border_plus6");
  }
  if (includeMemo) {
    columns.push("memo");
  }
  if (includeStreamContent) {
    columns.push("stream_content");
  }

  const { data, error } = await supabase
    .schema("iriam")
    .from("schedule_entries")
    .select(columns.join(", "))
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

