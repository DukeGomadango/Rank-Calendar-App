import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

import type { CalendarScheduleRow, CalendarScheduleUpsertInput } from "./schedules";

/** Server Actions / Route から呼ぶ。JWT 付きクライアントで RPC 実行。 */
export function calendarScheduleRowToRpcJson(row: CalendarScheduleRow): Record<string, unknown> {
  return {
    id: row.id,
    calendar_id: row.calendar_id,
    date: row.date,
    end_date: row.end_date,
    start_time: row.start_time,
    end_time: row.end_time,
    is_all_day: row.is_all_day,
    title: row.title,
    kind: row.kind,
    visibility: row.visibility,
    color_id: row.color_id,
    memo: row.memo,
    created_at: row.created_at,
  };
}

export function calendarScheduleUpsertToRpcJson(
  calendarId: string,
  input: CalendarScheduleUpsertInput
): Record<string, unknown> {
  return {
    id: input.id ?? null,
    calendar_id: calendarId,
    date: input.date,
    end_date: input.end_date,
    start_time: input.start_time,
    end_time: input.end_time,
    is_all_day: input.is_all_day,
    title: input.title,
    kind: input.kind,
    visibility: input.visibility,
    color_id: input.color_id,
    memo: input.memo,
  };
}

export async function rpcCalendarScheduleApplyUpsertUndo(
  calendarId: string,
  before: CalendarScheduleRow | null,
  after: CalendarScheduleUpsertInput
): Promise<void> {
  const supabase = await createSupabaseRouteHandlerClient();
  const pAfter = calendarScheduleUpsertToRpcJson(calendarId, after);
  const { error } = await supabase.schema("iriam").rpc("calendar_schedule_apply_upsert_undo", {
    p_before: before ? calendarScheduleRowToRpcJson(before) : null,
    p_after: pAfter,
  });
  if (error) {
    throwDataLayerError(
      new Error(
        `calendar_schedule_apply_upsert_undo failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }
}

export async function rpcCalendarScheduleApplyDeleteUndo(
  calendarId: string,
  scheduleId: string
): Promise<void> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { error } = await supabase.schema("iriam").rpc("calendar_schedule_apply_delete_undo", {
    p_calendar_id: calendarId,
    p_schedule_id: scheduleId,
  });
  if (error) {
    throwDataLayerError(
      new Error(
        `calendar_schedule_apply_delete_undo failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }
}

export async function rpcCalendarScheduleUndo(calendarId: string): Promise<void> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { error } = await supabase.schema("iriam").rpc("calendar_schedule_undo", {
    p_calendar_id: calendarId,
  });
  if (error) {
    throwDataLayerError(
      new Error(`calendar_schedule_undo failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function rpcCalendarScheduleRedo(calendarId: string): Promise<void> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { error } = await supabase.schema("iriam").rpc("calendar_schedule_redo", {
    p_calendar_id: calendarId,
  });
  if (error) {
    throwDataLayerError(
      new Error(`calendar_schedule_redo failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}
