"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import {
  createRole as createRoleData,
  deleteRole as deleteRoleData,
  setRolePermissions as setRolePermissionsData,
} from "@/lib/data/roles";
import {
  createInviteLink as createInviteLinkData,
  deleteInviteLink as deleteInviteLinkData,
} from "@/lib/data/invite-links";
import { upsertShare } from "@/lib/data/shares";
import type { PermissionKey } from "@/lib/data/permissions";

const SHARING_PATH = "/dashboard/sharing";

export async function createRole(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("ロール名を入力してください");

  await createRoleData(calendar.id, name);
  revalidatePath(SHARING_PATH);
}

export async function deleteRole(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const roleId = formData.get("role_id") as string;
  if (!roleId) throw new Error("role_id が必要です");

  await deleteRoleData(roleId, calendar.id);
  revalidatePath(SHARING_PATH);
}

export async function saveRolePermissions(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

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
  ] as PermissionKey[]) {
    if (formData.get(`perm_${key}`) === "on") {
      permissions.push(key);
    }
  }
  await setRolePermissionsData(roleId, permissions);
  revalidatePath(SHARING_PATH);
}

export async function createInviteLinkAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const roleId = (formData.get("role_id") as string)?.trim() || null;
  if (roleId === "" || roleId === "none") {
    await createInviteLinkData(calendar.id, user.id, null, null);
  } else {
    await createInviteLinkData(calendar.id, user.id, null, roleId);
  }
  revalidatePath(SHARING_PATH);
}

export async function deleteInviteLink(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const id = formData.get("invite_link_id") as string;
  if (!id) throw new Error("invite_link_id が必要です");

  await deleteInviteLinkData(id, calendar.id);
  revalidatePath(SHARING_PATH);
}

export async function assignRoleToUser(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const targetUserId = formData.get("user_id") as string;
  const roleId = (formData.get("role_id") as string)?.trim();
  if (!targetUserId) throw new Error("user_id が必要です");
  if (!roleId || roleId === "none") {
    const { deleteShare } = await import("@/lib/data/shares");
    await deleteShare(calendar.id, targetUserId);
    revalidatePath(SHARING_PATH);
    return;
  }
  await upsertShare(calendar.id, targetUserId, roleId);
  revalidatePath(SHARING_PATH);
}

export async function removeShare(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const targetUserId = formData.get("user_id") as string;
  if (!targetUserId) throw new Error("user_id が必要です");

  const { deleteShare } = await import("@/lib/data/shares");
  await deleteShare(calendar.id, targetUserId);
  revalidatePath(SHARING_PATH);
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
