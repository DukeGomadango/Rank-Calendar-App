import { cache } from "react";
import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CalendarRow = {
  id: string;
  name: string | null;
};

export type AccessibleCalendarRow = {
  id: string;
  name: string | null;
  isOwner: boolean;
};

/** Server 用 Supabase クライアントの型（Route Handler 用を渡すと RLS で auth.uid() が効く） */
type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * ユーザーに紐づくデフォルトカレンダーを1件取得し、
 * 存在しなければ作成して返す。
 * 作成は DB の create_my_default_calendar() RPC（SECURITY DEFINER）で行うため、
 * 認証済みクライアントを渡せばサービスロール不要で作成できる。
 * @param supabaseClient - 省略時は createSupabaseServerClient() を使用。Server Action から呼ぶときは createSupabaseRouteHandlerClient() を渡す。
 */
export async function getOrCreateDefaultCalendarForUser(
  userId: string,
  supabaseClient?: ServerSupabaseClient
): Promise<CalendarRow> {
  const supabase = supabaseClient ?? (await createSupabaseServerClient());

  const { data: rows, error } = await supabase
    .schema("iriam")
    .rpc("create_my_default_calendar");

  if (error) {
    throwDataLayerError(
      new Error(`create_my_default_calendar failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }

  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row || typeof row.id !== "string") {
    throwDataLayerError(
      new Error("create_my_default_calendar returned no row (auth.uid() may be null)")
    );
  }

  return { id: row.id, name: row.name ?? null } as CalendarRow;
}

/**
 * ユーザーがオーナーであるカレンダーが1件以上あるかどうか。
 * レイアウトで「共有タブを表示するか」の判定に使用（作成はしない）。
 * React cache() で同一リクエスト内の重複呼び出しを抑止し、タブ切り替え時の負荷を軽減する。
 */
export const hasOwnedCalendar = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throwDataLayerError(
      new Error(`calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
  return data != null;
});

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
    throwDataLayerError(
      new Error(`calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
  return (data ?? []) as CalendarRow[];
}

/**
 * ユーザーがアクセス可能なカレンダー一覧（オーナー＋共有先）。RLS でフィルタされる。
 * 並び: オーナーのものを先に、その後名前順。
 */
export async function listCalendarsAccessibleToUser(
  userId: string
): Promise<AccessibleCalendarRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id, name, owner_id");

  if (error) {
    throwDataLayerError(
      new Error(`calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }

  const rows = (data ?? []) as { id: string; name: string | null; owner_id: string }[];
  const withOwner = rows.map((r) => ({
    id: r.id,
    name: r.name,
    isOwner: r.owner_id === userId,
  }));
  withOwner.sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    const na = a.name ?? "";
    const nb = b.name ?? "";
    return na.localeCompare(nb);
  });
  return withOwner;
}

/**
 * 表示に使う「現在のカレンダー」を解決する。
 * - urlCalendarId が渡されていれば、アクセス可能ならそれを返す。
 * - 未指定ならデフォルト: オーナーが1件以上いれば getOrCreateDefaultCalendarForUser（無ければ作成）、
 *   オーナーが0件なら共有の先頭1件（作成はしない）。0件なら null。
 */
export async function getCurrentCalendarForUser(
  userId: string,
  urlCalendarId: string | null
): Promise<AccessibleCalendarRow | null> {
  const accessible = await listCalendarsAccessibleToUser(userId);
  if (accessible.length === 0) return null;

  if (urlCalendarId) {
    const found = accessible.find((c) => c.id === urlCalendarId);
    if (found) return found;
  }

  const owned = accessible.find((c) => c.isOwner);
  if (owned) {
    const defaultCal = await getOrCreateDefaultCalendarForUser(userId);
    return { id: defaultCal.id, name: defaultCal.name, isOwner: true };
  }

  return accessible[0];
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
    throwDataLayerError(
      new Error(`calendars select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
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
    throwDataLayerError(
      new Error(`calendars update (name) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

