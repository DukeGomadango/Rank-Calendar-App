import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CalendarScheduleRow = {
  id: string;
  calendar_id: string;
  date: string; // YYYY-MM-DD (JST 想定)
  start_time: string | null; // HH:MM:SS
  end_time: string | null; // HH:MM:SS
  is_all_day: boolean;
  title: string;
  kind: string | null;
  visibility: string | null;
  color_id: string | null;
  memo: string | null;
  created_at: string;
};

export type CalendarScheduleUpsertInput = {
  id?: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  title: string;
  kind: string | null;
  visibility: string | null;
  color_id: string | null;
  memo: string | null;
};

/**
 * 指定カレンダーの指定期間の予定一覧を取得する。
 * ランク計算用 schedule_entries とは独立した、時間付きの予定情報のみを扱う。
 */
export async function getSchedulesInRange(
  calendarId: string,
  fromDate: string,
  toDate: string
): Promise<CalendarScheduleRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("iriam")
    .from("calendar_schedules")
    .select(
      "id, calendar_id, date, start_time, end_time, is_all_day, title, kind, visibility, color_id, memo, created_at"
    )
    .eq("calendar_id", calendarId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) {
    throwDataLayerError(
      new Error(
        `calendar_schedules select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }

  return (data ?? []) as CalendarScheduleRow[];
}

/**
 * 予定を作成または更新する。
 * id が指定されていればその行を更新し、指定されていなければ新規作成する。
 */
export async function upsertScheduleForCalendar(
  calendarId: string,
  input: CalendarScheduleUpsertInput
): Promise<CalendarScheduleRow> {
  const supabase = await createSupabaseServerClient();

  const payload: Record<string, unknown> = {
    calendar_id: calendarId,
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    is_all_day: input.is_all_day,
    title: input.title,
    kind: input.kind,
    visibility: input.visibility,
    color_id: input.color_id,
    memo: input.memo,
  };

  if (input.id) {
    payload.id = input.id;
  }

  const { data, error } = await supabase
    .schema("iriam")
    .from("calendar_schedules")
    .upsert(payload, {
      onConflict: "id",
    })
    .select(
      "id, calendar_id, date, start_time, end_time, is_all_day, title, kind, visibility, color_id, memo, created_at"
    )
    .single();

  if (error) {
    throwDataLayerError(
      new Error(
        `calendar_schedules upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }

  return data as CalendarScheduleRow;
}

/**
 * 予定を1件削除する。
 */
export async function deleteScheduleById(
  scheduleId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .schema("iriam")
    .from("calendar_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    throwDataLayerError(
      new Error(
        `calendar_schedules delete failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }
}

