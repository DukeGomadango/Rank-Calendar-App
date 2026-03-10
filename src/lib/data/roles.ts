import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PermissionKey } from "./permissions";

export type RoleRow = {
  id: string;
  calendar_id: string;
  name: string;
};

export async function listRolesForCalendar(
  calendarId: string
): Promise<RoleRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("roles")
    .select("id, calendar_id, name")
    .eq("calendar_id", calendarId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `roles select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return (data ?? []) as RoleRow[];
}

export async function createRole(
  calendarId: string,
  name: string
): Promise<RoleRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("roles")
    .insert({ calendar_id: calendarId, name })
    .select("id, calendar_id, name")
    .single();

  if (error) {
    throw new Error(
      `roles insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return data as RoleRow;
}

export async function deleteRole(roleId: string, calendarId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("iriam")
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("calendar_id", calendarId);

  if (error) {
    throw new Error(
      `roles delete failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
}

export async function getPermissionsForRole(
  roleId: string
): Promise<PermissionKey[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("iriam")
    .from("role_permissions")
    .select("permission")
    .eq("role_id", roleId);

  if (error) {
    throw new Error(
      `role_permissions select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
    );
  }
  return (data ?? []).map((r) => r.permission as PermissionKey);
}

export async function setRolePermissions(
  roleId: string,
  permissions: PermissionKey[]
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .schema("iriam")
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);

  if (permissions.length > 0) {
    const { error } = await supabase
      .schema("iriam")
      .from("role_permissions")
      .insert(permissions.map((permission) => ({ role_id: roleId, permission })));

    if (error) {
      throw new Error(
        `role_permissions insert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`
      );
    }
  }
}
