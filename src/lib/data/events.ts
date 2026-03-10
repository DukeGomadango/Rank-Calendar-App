import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EventRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export async function listEventsForCalendar(
  calendarId: string
): Promise<EventRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("iriam")
    .from("events")
    .select("id, name, start_date, end_date")
    .eq("calendar_id", calendarId)
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `events select failed: ${error.message ?? ""} (code=${
        error.code ?? "unknown"
      })`
    );
  }

  return (data ?? []) as EventRow[];
}

export async function createEventForCalendar(
  calendarId: string,
  name: string,
  startDate: string | null,
  endDate: string | null
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
    });

  if (error) {
    throw new Error(
      `events insert failed: ${error.message ?? ""} (code=${
        error.code ?? "unknown"
      })`
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
    throw new Error(
      `events delete failed: ${error.message ?? ""} (code=${
        error.code ?? "unknown"
      })`
    );
  }
}

