import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EventType = "ranking" | "achievement" | "background" | "other";

export type EventRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  color: string | null;
  event_type: EventType | null;
};

/**
 * イベントが「指定日」を含むか（start_date/end_date の片側 null は“その側の日付のみ”
 * として扱う。= 既存UIの getEventsOnDate / eventsOnDate の挙動に合わせる）
 */
export function eventOverlapsDate(
  ev: Pick<EventRow, "start_date" | "end_date">,
  date: string
): boolean {
  const start = ev.start_date ?? ev.end_date;
  const end = ev.end_date ?? ev.start_date;
  if (start == null || end == null) return false;
  return start <= date && date <= end;
}

/**
 * イベントが「指定期間」を何らかの形で重なるか。
 */
export function eventOverlapsRange(
  ev: Pick<EventRow, "start_date" | "end_date">,
  fromDate: string,
  toDate: string
): boolean {
  const start = ev.start_date ?? ev.end_date;
  const end = ev.end_date ?? ev.start_date;
  if (start == null || end == null) return false;
  return start <= toDate && end >= fromDate;
}

function eventsSelectFields(): string {
  return "id, name, start_date, end_date, color, event_type";
}

export async function listEventsForCalendarOnDate(
  calendarId: string,
  date: string
): Promise<EventRow[]> {
  const supabase = await createSupabaseServerClient();

  // - start_date/end_date 両方あり: start_date <= date && end_date >= date
  // - start_date のみあり: start_date == date（end_date が null）
  // - end_date のみあり: end_date == date（start_date が null）
  const { data, error } = await supabase
    .schema("iriam")
    .from("events")
    .select(eventsSelectFields())
    .eq("calendar_id", calendarId)
    .or(
      [
        `and(start_date.lte.${date},end_date.gte.${date})`,
        `and(start_date.eq.${date},end_date.is.null)`,
        `and(end_date.eq.${date},start_date.is.null)`,
      ].join(",")
    )
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throwDataLayerError(
      new Error(
        `events on date select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }

  const rows = (data ?? []) as EventRow[];
  // SQL 側条件の安全弁（nullパターン等がズレるとUIの点表示が崩れるため）
  return rows.filter((ev) => eventOverlapsDate(ev, date));
}

export async function listEventsForCalendarOverlappingRange(
  calendarId: string,
  fromDate: string,
  toDate: string
): Promise<EventRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("iriam")
    .from("events")
    .select(eventsSelectFields())
    .eq("calendar_id", calendarId)
    .or(
      [
        // 両端あり（またぎ）
        `and(start_date.lte.${toDate},end_date.gte.${fromDate})`,
        // start_date のみあり（単日扱い）
        `and(start_date.gte.${fromDate},start_date.lte.${toDate},end_date.is.null)`,
        // end_date のみあり（単日扱い）
        `and(end_date.gte.${fromDate},end_date.lte.${toDate},start_date.is.null)`,
      ].join(",")
    )
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throwDataLayerError(
      new Error(
        `events range select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }

  const rows = (data ?? []) as EventRow[];
  // SQL 側条件の安全弁（nullパターン等がズレると表示が崩れるため）
  return rows.filter((ev) => eventOverlapsRange(ev, fromDate, toDate));
}

export async function listEventsForCalendar(
  calendarId: string
): Promise<EventRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("iriam")
    .from("events")
    .select("id, name, start_date, end_date, color, event_type")
    .eq("calendar_id", calendarId)
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throwDataLayerError(
      new Error(`events select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }

  return (data ?? []) as EventRow[];
}

export async function createEventForCalendar(
  calendarId: string,
  name: string,
  startDate: string | null,
  endDate: string | null,
  color: string | null = null,
  eventType: EventType | null = null
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .schema("iriam")
    .from("events")
    .insert({
      calendar_id: calendarId,
      name,
      start_date: startDate,
      end_date: endDate,
      color: color || null,
      event_type: eventType || null,
    });

  if (error) {
    throwDataLayerError(
      new Error(`events insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function updateEventForCalendar(
  id: string,
  calendarId: string,
  fields: {
    name: string;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
    eventType: EventType | null;
  }
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .schema("iriam")
    .from("events")
    .update({
      name: fields.name,
      start_date: fields.startDate,
      end_date: fields.endDate,
      color: fields.color,
      event_type: fields.eventType,
    })
    .eq("id", id)
    .eq("calendar_id", calendarId);

  if (error) {
    throwDataLayerError(
      new Error(`events update failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function deleteEvent(id: string, calendarId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .schema("iriam")
    .from("events")
    .delete()
    .eq("id", id)
    .eq("calendar_id", calendarId);

  if (error) {
    throwDataLayerError(
      new Error(`events delete failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

