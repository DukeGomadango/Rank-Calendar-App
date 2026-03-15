"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOrCreateDefaultCalendarForUser,
  listCalendarsForUser,
} from "@/lib/data/calendars";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";

const SETTINGS_PATH = "/dashboard/settings";

/**
 * カレンダーのスケジュールデータをCSV形式で返す。
 * 認証済みユーザーがオーナーのカレンダーのみ対象。
 */
export async function exportCalendarCsv(
  calendarId: string
): Promise<{ csv: string; filename: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未ログインです" };

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  if (calendar.id !== calendarId) return { error: "このカレンダーをエクスポートする権限がありません" };

  const entries = await getScheduleEntriesInRange(
    calendarId,
    "2000-01-01",
    "2030-12-31"
  );

  const header =
    "日付,目標+,実績+,スキップパス,ボーダー+2,ボーダー+4,ボーダー+6,メモ";
  const rows = entries.map((e) => {
    const memo = (e.memo ?? "").replace(/"/g, '""');
    return [
      e.date,
      e.target_plus ?? "",
      e.actual_plus ?? "",
      e.skip_pass_used ? "1" : "0",
      e.border_plus2 ?? "",
      e.border_plus4 ?? "",
      e.border_plus6 ?? "",
      memo ? `"${memo}"` : "",
    ].join(",");
  });
  const csv = [header, ...rows].join("\n");
  const filename = `iriam-calendar-${calendarId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

/**
 * カレンダーのスケジュールデータをすべて削除する（初期化）。
 * 認証済みユーザーがオーナーのカレンダーのみ対象。
 */
export async function resetCalendarData(
  calendarId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  if (calendar.id !== calendarId) return { ok: false, error: "このカレンダーを初期化する権限がありません" };

  const { error } = await supabase
    .schema("iriam")
    .from("schedule_entries")
    .delete()
    .eq("calendar_id", calendarId);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath(SETTINGS_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
  return { ok: true };
}

/**
 * アカウント削除前に、このユーザーがオーナーの全データを削除する。
 * 呼び出し元で supabase.auth.deleteUser() を実行すること。
 */
export async function deleteMyAccountData(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const calendars = await listCalendarsForUser(user.id);
  for (const cal of calendars) {
    const { data: links } = await supabase
      .schema("iriam")
      .from("invite_links")
      .select("id")
      .eq("calendar_id", cal.id);
    const linkIds = (links ?? []).map((r) => r.id);
    if (linkIds.length > 0) {
      await supabase
        .schema("iriam")
        .from("invite_redemptions")
        .delete()
        .in("invite_link_id", linkIds);
    }
    await supabase
      .schema("iriam")
      .from("invite_links")
      .delete()
      .eq("calendar_id", cal.id);

    const { data: roleRows } = await supabase
      .schema("iriam")
      .from("roles")
      .select("id")
      .eq("calendar_id", cal.id);
    const roleIds = (roleRows ?? []).map((r) => r.id);
    if (roleIds.length > 0) {
      await supabase
        .schema("iriam")
        .from("role_permissions")
        .delete()
        .in("role_id", roleIds);
    }
    await supabase.schema("iriam").from("roles").delete().eq("calendar_id", cal.id);
    await supabase
      .schema("iriam")
      .from("schedule_entries")
      .delete()
      .eq("calendar_id", cal.id);
    await supabase
      .schema("iriam")
      .from("calendar_rank_state")
      .delete()
      .eq("calendar_id", cal.id);
    await supabase
      .schema("iriam")
      .from("calendar_rank_cycle_history")
      .delete()
      .eq("calendar_id", cal.id);
    await supabase.schema("iriam").from("events").delete().eq("calendar_id", cal.id);
    await supabase.schema("iriam").from("shares").delete().eq("calendar_id", cal.id);
    await supabase.schema("iriam").from("calendars").delete().eq("id", cal.id);
  }
  revalidatePath("/");
  return { ok: true };
}
