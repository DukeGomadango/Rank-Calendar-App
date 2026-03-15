import { randomBytes } from "crypto";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type InviteLinkRow = {
  id: string;
  calendar_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
  role_id: string | null;
};

export async function createInviteLink(
  calendarId: string,
  createdBy: string,
  expiresAt: string | null = null,
  roleId: string | null = null
): Promise<InviteLinkRow> {
  const supabase = await createSupabaseServerClient();
  const token = randomBytes(24).toString("base64url");

  const { data, error } = await supabase
    .schema("iriam")
    .from("invite_links")
    .insert({
      calendar_id: calendarId,
      token,
      created_by: createdBy,
      expires_at: expiresAt,
      role_id: roleId || null,
    })
    .select("id, calendar_id, token, created_by, expires_at, created_at, role_id")
    .single();

  if (error) {
    throw new Error(
      `invite_links insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return data as InviteLinkRow;
}

export async function listInviteLinksForCalendar(
  calendarId: string
): Promise<InviteLinkRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("invite_links")
    .select("id, calendar_id, token, created_by, expires_at, created_at, role_id")
    .eq("calendar_id", calendarId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `invite_links select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return (data ?? []) as InviteLinkRow[];
}

export async function getInviteLinkByToken(
  calendarId: string,
  token: string
): Promise<InviteLinkRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("invite_links")
    .select("id, calendar_id, token, created_by, expires_at, created_at, role_id")
    .eq("calendar_id", calendarId)
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(
      `invite_links select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }
  return data as InviteLinkRow;
}

/**
 * 招待リンクのトークン検証（招待される側のユーザーがログイン後に叩く用）。
 * RLS では invite_links はオーナーしか読めないため、サービスロールで検証する。
 */
export async function getInviteLinkByTokenForRedeem(
  calendarId: string,
  token: string
): Promise<InviteLinkRow | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("invite_links")
    .select("id, calendar_id, token, created_by, expires_at, created_at, role_id")
    .eq("calendar_id", calendarId)
    .eq("token", token)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[invite] getInviteLinkByTokenForRedeem error:", error.message, error.code);
    }
    return null;
  }
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }
  return data as InviteLinkRow;
}

export async function deleteInviteLink(
  id: string,
  calendarId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("invite_links")
    .delete()
    .eq("id", id)
    .eq("calendar_id", calendarId);

  if (error) {
    throw new Error(
      `invite_links delete failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}
