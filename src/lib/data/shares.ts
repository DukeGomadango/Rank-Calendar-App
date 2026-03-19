import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type ShareRow = {
  calendar_id: string;
  user_id: string;
  role_id: string;
  created_at: string;
};

export type ShareWithProfileRow = ShareRow & {
  display_name: string | null;
};

export async function listSharesForCalendar(
  calendarId: string
): Promise<ShareRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("shares")
    .select("calendar_id, user_id, role_id, created_at")
    .eq("calendar_id", calendarId);

  if (error) {
    throwDataLayerError(
      new Error(`shares select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
  return (data ?? []) as ShareRow[];
}

export async function listSharesWithProfilesForCalendar(
  calendarId: string
): Promise<ShareWithProfileRow[]> {
  const shares = await listSharesForCalendar(calendarId);
  if (shares.length === 0) return [];
  const userIds = [...new Set(shares.map((s) => s.user_id))];
  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (error) {
    throwDataLayerError(
      new Error(
        `profiles select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      )
    );
  }
  const profileMap = new Map(
    (profiles ?? []).map((p) => [String(p.id), (p.display_name as string | null) ?? null])
  );
  return shares.map((s) => ({
    ...s,
    display_name: profileMap.get(s.user_id) ?? null,
  }));
}

export async function upsertShare(
  calendarId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("shares")
    .upsert(
      { calendar_id: calendarId, user_id: userId, role_id: roleId },
      { onConflict: "calendar_id,user_id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`shares upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function deleteShare(
  calendarId: string,
  userId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("shares")
    .delete()
    .eq("calendar_id", calendarId)
    .eq("user_id", userId);

  if (error) {
    throwDataLayerError(
      new Error(`shares delete failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

/**
 * 招待リンク redeem 時に、リンクに role_id が紐づいている場合に自動で share を作成する用。
 * RLS ではオーナーしか shares を insert できないため、サービスロールで実行する。
 */
export async function upsertShareWithServiceRole(
  calendarId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("iriam")
    .from("shares")
    .upsert(
      { calendar_id: calendarId, user_id: userId, role_id: roleId },
      { onConflict: "calendar_id,user_id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`shares upsert (service) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}
