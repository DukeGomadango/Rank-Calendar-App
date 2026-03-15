import { createSupabaseServerClient } from "@/lib/supabase/server";

type CalendarRow = {
  id: string;
  name: string | null;
};

/**
 * ユーザーに紐づくデフォルトカレンダーを1件取得し、
 * 存在しなければ作成して返す。
 */
export async function getOrCreateDefaultCalendarForUser(
  userId: string
): Promise<CalendarRow> {
  const supabase = await createSupabaseServerClient();

  const { data: existing, error } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }

  if (existing) {
    return existing as CalendarRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .schema("iriam")
    .from("calendars")
    .insert({
      owner_id: userId,
      name: "メインカレンダー",
    })
    .select("id, name")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `calendars insert failed: ${
        insertError?.message ?? "unknown error"
      } (code=${insertError?.code ?? "unknown"})`
    );
  }

  return inserted as CalendarRow;
}

/**
 * ユーザーがオーナーであるカレンダーが1件以上あるかどうか。
 * レイアウトで「共有タブを表示するか」の判定に使用（作成はしない）。
 */
export async function hasOwnedCalendar(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return data != null;
}

/**
 * ユーザーがオーナーであるカレンダー一覧を取得（作成はしない）。
 */
export async function listCalendarsForUser(
  userId: string
): Promise<CalendarRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return (data ?? []) as CalendarRow[];
}

/**
 * 指定IDのカレンダーを1件取得。RLS によりオーナーまたは共有先のみ取得可。
 */
export async function getCalendarById(
  calendarId: string
): Promise<CalendarRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id, name")
    .eq("id", calendarId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return data as CalendarRow | null;
}

/**
 * カレンダー名を更新する（オンボーディング等でライバー名を設定する用）。
 */
export async function updateCalendarName(
  calendarId: string,
  name: string | null
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("calendars")
    .update({ name: name?.trim() || null })
    .eq("id", calendarId);

  if (error) {
    throw new Error(
      `calendars update (name) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

