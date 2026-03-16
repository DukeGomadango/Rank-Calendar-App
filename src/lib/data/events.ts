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

