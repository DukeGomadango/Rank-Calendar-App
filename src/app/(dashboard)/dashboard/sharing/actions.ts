"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserCanEditCalendar } from "@/lib/auth/permission";
import {
  createRole as createRoleData,
  deleteRole as deleteRoleData,
  setRolePermissions as setRolePermissionsData,
} from "@/lib/data/roles";
import {
  createInviteLink as createInviteLinkData,
  deleteInviteLink as deleteInviteLinkData,
  type InviteLinkRow,
} from "@/lib/data/invite-links";
import { upsertShare, listSharesForCalendar } from "@/lib/data/shares";
import { listRolesForCalendar } from "@/lib/data/roles";
import { listRedemptionsForCalendar } from "@/lib/data/invite-redemptions";
import type { PermissionKey } from "@/lib/data/permissions";

const SHARING_PATH = "/dashboard/sharing";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SharingActionResult = {
  ok: boolean;
  message?: string;
};

export type CreateInviteLinkActionResult = SharingActionResult & {
  link?: InviteLinkRow;
};

function getCalendarIdFromForm(formData: FormData): string {
  const calendarId = formData.get("calendar_id");
  if (typeof calendarId !== "string" || !calendarId) throw new Error("calendar_id が必要です");
  return calendarId;
}

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

async function validateRoleInCalendar(
  calendarId: string,
  roleId: string | null
): Promise<string | null> {
  if (!roleId) return null;
  if (!isUuid(roleId)) throw new Error("role_id が不正です");
  const roles = await listRolesForCalendar(calendarId);
  const exists = roles.some((r) => r.id === roleId);
  if (!exists) throw new Error("指定されたロールはこのカレンダーに存在しません");
  return roleId;
}

async function ensureShareTargetExists(
  calendarId: string,
  targetUserId: string
): Promise<void> {
  const [shares, redemptions] = await Promise.all([
    listSharesForCalendar(calendarId),
    listRedemptionsForCalendar(calendarId),
  ]);
  const shared = shares.some((s) => s.user_id === targetUserId);
  const redeemed = redemptions.some((r) => r.user_id === targetUserId);
  if (!shared && !redeemed) {
    throw new Error("このユーザーは招待済み一覧に存在しません");
  }
}

export async function createRole(formData: FormData): Promise<void> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("ロール名を入力してください");

  await createRoleData(calendarId, name);
  revalidatePath(SHARING_PATH);
}

export async function deleteRole(formData: FormData): Promise<void> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const roleId = formData.get("role_id") as string;
  if (!roleId) throw new Error("role_id が必要です");

  await deleteRoleData(roleId, calendarId);
  revalidatePath(SHARING_PATH);
}

export async function saveRolePermissions(formData: FormData): Promise<void> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const roleId = formData.get("role_id") as string;
  if (!roleId) throw new Error("role_id が必要です");

  const permissions: PermissionKey[] = [];
  for (const key of [
    "view_calendar",
    "view_table",
    "view_borders",
    "view_memo",
    "view_target_actual",
    "view_rank",
    "view_events",
    // スケジュール閲覧権限も role_permissions に保存する
    "view_schedule_stream",
    "view_schedule_personal",
    "view_schedule_secret",
  ] as PermissionKey[]) {
    if (formData.get(`perm_${key}`) === "on") {
      permissions.push(key);
    }
  }
  await setRolePermissionsData(roleId, permissions);
  revalidatePath(SHARING_PATH);
}

export async function createInviteLinkAction(
  formData: FormData
): Promise<CreateInviteLinkActionResult> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const roleIdRaw = (formData.get("role_id") as string)?.trim() || null;
  const roleId = await validateRoleInCalendar(
    calendarId,
    roleIdRaw && roleIdRaw !== "none" ? roleIdRaw : null
  );
  const link = await createInviteLinkData(calendarId, user.id, null, roleId);
  revalidatePath(SHARING_PATH);
  return { ok: true, link };
}

export async function deleteInviteLink(formData: FormData): Promise<SharingActionResult> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const id = formData.get("invite_link_id") as string;
  if (!id) throw new Error("invite_link_id が必要です");
  if (!isUuid(id)) throw new Error("invite_link_id が不正です");

  await deleteInviteLinkData(id, calendarId);
  revalidatePath(SHARING_PATH);
  return { ok: true };
}

export async function assignRoleToUser(formData: FormData): Promise<SharingActionResult> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const targetUserId = formData.get("user_id") as string;
  const roleIdRaw = (formData.get("role_id") as string)?.trim();
  if (!targetUserId) throw new Error("user_id が必要です");
  if (!isUuid(targetUserId)) throw new Error("user_id が不正です");
  await ensureShareTargetExists(calendarId, targetUserId);

  if (!roleIdRaw || roleIdRaw === "none") {
    const { deleteShare } = await import("@/lib/data/shares");
    await deleteShare(calendarId, targetUserId);
    revalidatePath(SHARING_PATH);
    return { ok: true };
  }
  const roleId = await validateRoleInCalendar(calendarId, roleIdRaw);
  if (!roleId) throw new Error("role_id が必要です");
  await upsertShare(calendarId, targetUserId, roleId);
  revalidatePath(SHARING_PATH);
  return { ok: true };
}

export async function removeShare(formData: FormData): Promise<SharingActionResult> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendarId = getCalendarIdFromForm(formData);
  await ensureUserCanEditCalendar(calendarId);
  const targetUserId = formData.get("user_id") as string;
  if (!targetUserId) throw new Error("user_id が必要です");
  if (!isUuid(targetUserId)) throw new Error("user_id が不正です");

  const { deleteShare } = await import("@/lib/data/shares");
  await deleteShare(calendarId, targetUserId);
  revalidatePath(SHARING_PATH);
  return { ok: true };
}

/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopCreateRole(_formData: FormData): Promise<void> {
  "use server";
}
/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopDeleteRole(_formData: FormData): Promise<void> {
  "use server";
}
/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopSaveRolePermissions(_formData: FormData): Promise<void> {
  "use server";
}
/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopCreateInviteLinkAction(): Promise<void> {
  "use server";
}
/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopDeleteInviteLink(_formData: FormData): Promise<void> {
  "use server";
}
/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopAssignRoleToUser(_formData: FormData): Promise<void> {
  "use server";
}
