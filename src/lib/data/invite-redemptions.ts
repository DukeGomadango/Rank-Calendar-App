import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InviteRedemptionRow = {
  id: string;
  invite_link_id: string;
  user_id: string;
  redeemed_at: string;
};

export async function redeemInvite(
  inviteLinkId: string,
  userId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("invite_redemptions")
    .upsert(
      { invite_link_id: inviteLinkId, user_id: userId },
      { onConflict: "invite_link_id,user_id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`invite_redemptions upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export type RedemptionWithUser = {
  id: string;
  user_id: string;
  redeemed_at: string;
  invite_link_id: string;
  display_name: string | null;
};

export async function listRedemptionsForCalendar(
  calendarId: string
): Promise<RedemptionWithUser[]> {
  const supabase = await createSupabaseServerClient();
  const { data: links, error: linksError } = await supabase
    .schema("iriam")
    .from("invite_links")
    .select("id")
    .eq("calendar_id", calendarId);

  if (linksError || !links?.length) {
    return [];
  }
  const linkIds = links.map((l) => l.id);

  const { data: redemptions, error } = await supabase
    .schema("iriam")
    .from("invite_redemptions")
    .select("id, invite_link_id, user_id, redeemed_at")
    .in("invite_link_id", linkIds)
    .order("redeemed_at", { ascending: false });

  if (error || !redemptions?.length) {
    return [];
  }

  const userIds = [...new Set(redemptions.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? null])
  );

  return (redemptions as InviteRedemptionRow[]).map((r) => ({
    ...r,
    display_name: profileMap.get(r.user_id) ?? null,
  }));
}
