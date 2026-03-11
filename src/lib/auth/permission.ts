import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/data/permissions";

export type CalendarPermissionFlags = {
  isOwner: boolean;
  canEditSchedule: boolean;
  canViewCalendar: boolean;
  canViewTable: boolean;
  canViewBorders: boolean;
  canViewMemo: boolean;
  canViewTargetActual: boolean;
  canViewRank: boolean;
  canViewEvents: boolean;
};

const ALL_FLAGS_FOR_OWNER: CalendarPermissionFlags = {
  isOwner: true,
  canEditSchedule: true,
  canViewCalendar: true,
  canViewTable: true,
  canViewBorders: true,
  canViewMemo: true,
  canViewTargetActual: true,
  canViewRank: true,
  canViewEvents: true,
};

function flagsFromPermissions(perms: PermissionKey[], isOwner: boolean): CalendarPermissionFlags {
  const has = (p: PermissionKey) => perms.includes(p);
  return {
    isOwner,
    canEditSchedule: isOwner, // v1 では編集はオーナーのみ
    canViewCalendar: has("view_calendar"),
    canViewTable: has("view_table"),
    canViewBorders: has("view_borders"),
    canViewMemo: has("view_memo"),
    canViewTargetActual: has("view_target_actual"),
    canViewRank: has("view_rank"),
    canViewEvents: has("view_events"),
  };
}

/**
 * 指定カレンダーに対する現在ユーザーの権限フラグを取得する。
 *
 * - オーナーであれば全権限を付与（編集可）
 * - shares にレコードがあれば、その role_id に紐づく role_permissions から閲覧権限を決定
 * - それ以外のユーザーは何も見られない（全部 false）
 */
export async function getCalendarPermissionsForUser(
  calendarId: string,
  userId: string
): Promise<CalendarPermissionFlags> {
  const supabase = await createSupabaseServerClient();

  // 1. カレンダーのオーナーかどうかを確認
  const { data: calendar, error: calendarError } = await supabase
    .schema("iriam")
    .from("calendars")
    .select("id, owner_id")
    .eq("id", calendarId)
    .maybeSingle();

  if (calendarError) {
    throw new Error(
      `calendars select failed: ${calendarError.message ?? ""} (code=${
        calendarError.code ?? "unknown"
      })`
    );
  }

  if (!calendar) {
    // カレンダー自体が存在しない場合は全て false
    return {
      isOwner: false,
      canEditSchedule: false,
      canViewCalendar: false,
      canViewTable: false,
      canViewBorders: false,
      canViewMemo: false,
      canViewTargetActual: false,
      canViewRank: false,
      canViewEvents: false,
    };
  }

  if (calendar.owner_id === userId) {
    return ALL_FLAGS_FOR_OWNER;
  }

  // 2. 共有レコードからロールを取得
  const { data: share, error: shareError } = await supabase
    .schema("iriam")
    .from("shares")
    .select("role_id")
    .eq("calendar_id", calendarId)
    .eq("user_id", userId)
    .maybeSingle();

  if (shareError) {
    throw new Error(
      `shares select failed: ${shareError.message ?? ""} (code=${
        shareError.code ?? "unknown"
      })`
    );
  }

  if (!share) {
    // 共有されていないユーザーは何も見られない
    return {
      isOwner: false,
      canEditSchedule: false,
      canViewCalendar: false,
      canViewTable: false,
      canViewBorders: false,
      canViewMemo: false,
      canViewTargetActual: false,
      canViewRank: false,
      canViewEvents: false,
    };
  }

  // 3. role_permissions からパーミッション一覧を取得
  const { data: rolePerms, error: rolePermsError } = await supabase
    .schema("iriam")
    .from("role_permissions")
    .select("permission")
    .eq("role_id", share.role_id);

  if (rolePermsError) {
    throw new Error(
      `role_permissions select failed: ${rolePermsError.message ?? ""} (code=${
        rolePermsError.code ?? "unknown"
      })`
    );
  }

  const perms = (rolePerms ?? [])
    .map((row) => row.permission as PermissionKey)
    .filter((p): p is PermissionKey => PERMISSION_KEYS.includes(p));

  return flagsFromPermissions(perms, false);
}

