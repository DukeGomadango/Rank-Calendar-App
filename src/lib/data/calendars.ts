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

