import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import {
  getCurrentCalendarForUser,
} from "@/lib/data/calendars";
import { getProfile } from "@/lib/data/profiles";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";
import { upsertShareWithServiceRole } from "@/lib/data/shares";

const DASHBOARD_CALENDAR_COOKIE = "iriam_dashboard_calendar_id";
const DASHBOARD_CALENDAR_HEADER = "x-dashboard-calendar-id";
const DASHBOARD_FROM_INVITE_HEADER = "x-dashboard-from-invite";
const DASHBOARD_PATHNAME_HEADER = "x-dashboard-pathname";

type LayoutProps = {
  children: ReactNode;
  searchParams?:
    | Promise<{ calendarId?: string; fromInvite?: string }>
    | { calendarId?: string; fromInvite?: string };
};

export default async function DashboardShellLayout({
  children,
  searchParams,
}: LayoutProps) {
  async function repairShareFromInvite(
    targetCalendarId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const supabaseService = createSupabaseServiceRoleClient();
    const { data: redemptions, error: redemptionsError } = await supabaseService
      .schema("iriam")
      .from("invite_redemptions")
      .select("invite_link_id")
      .eq("user_id", targetUserId)
      .order("redeemed_at", { ascending: false })
      .limit(20);
    if (redemptionsError) return false;
    const inviteLinkIds = (redemptions ?? [])
      .map((r) => r?.invite_link_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (inviteLinkIds.length === 0) return false;

    const { data: links, error: linksError } = await supabaseService
      .schema("iriam")
      .from("invite_links")
      .select("id, role_id")
      .eq("calendar_id", targetCalendarId)
      .in("id", inviteLinkIds)
      .order("created_at", { ascending: false })
      .limit(1);
    if (linksError) return false;
    const inviteLink = Array.isArray(links) ? links[0] : null;
    if (!inviteLink) return false;

    async function roleHasViewCalendar(roleId: string): Promise<boolean> {
      const { data, error } = await supabaseService
        .schema("iriam")
        .from("role_permissions")
        .select("permission")
        .eq("role_id", roleId)
        .eq("permission", "view_calendar")
        .limit(1);
      if (error) return false;
      return Array.isArray(data) && data.length > 0;
    }

    let roleId: string | null =
      typeof inviteLink.role_id === "string" ? inviteLink.role_id : null;
    if (roleId && !(await roleHasViewCalendar(roleId))) {
      roleId = null;
    }
    if (!roleId) {
      const { data: roles, error: rolesError } = await supabaseService
        .schema("iriam")
        .from("roles")
        .select("id")
        .eq("calendar_id", targetCalendarId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (rolesError) return false;
      const roleIds = (roles ?? [])
        .map((r) => r?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      for (const candidate of roleIds) {
        if (await roleHasViewCalendar(candidate)) {
          roleId = candidate;
          break;
        }
      }
      if (!roleId) {
        roleId = roleIds[0] ?? null;
      }
    }

    if (!roleId) return false;
    await upsertShareWithServiceRole(targetCalendarId, targetUserId, roleId);
    return true;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawSp = searchParams;
  const resolvedSp: { calendarId?: string; fromInvite?: string } =
    rawSp && typeof (rawSp as Promise<unknown>).then === "function"
      ? await (rawSp as Promise<{ calendarId?: string; fromInvite?: string }>)
      : (rawSp ?? {}) as { calendarId?: string; fromInvite?: string };

  const requestHeaders = await headers();
  const pathname = requestHeaders.get(DASHBOARD_PATHNAME_HEADER) ?? "";
  const isOnboardingPath = pathname.startsWith("/dashboard/onboarding");
  const isSettingsPath = pathname.startsWith("/dashboard/settings");
  const headerCalendarId =
    requestHeaders.get(DASHBOARD_CALENDAR_HEADER)?.trim() || null;
  const headerFromInvite =
    requestHeaders.get(DASHBOARD_FROM_INVITE_HEADER) === "1";
  const cookieStore = await cookies();
  const cookieCalendarId =
    cookieStore.get(DASHBOARD_CALENDAR_COOKIE)?.value?.trim() || null;
  const urlCalendarId =
    resolvedSp.calendarId ?? headerCalendarId ?? cookieCalendarId ?? null;
  const fromInvite = resolvedSp.fromInvite === "1" || headerFromInvite;

  if (!user) {
    redirect("/login");
  }

  if (isOnboardingPath) {
    return children;
  }

  let currentCalendar = await getCurrentCalendarForUser(
    user.id,
    urlCalendarId,
  );
  if (!currentCalendar && fromInvite && urlCalendarId) {
    const repaired = await repairShareFromInvite(urlCalendarId, user.id);
    if (repaired) {
      currentCalendar = await getCurrentCalendarForUser(user.id, urlCalendarId);
    }
  }

  if (!currentCalendar) {
    if (isSettingsPath) {
      return children;
    }
    if (fromInvite) {
      redirect("/dashboard/settings");
    }
    const profile = await getProfile(user.id);
    if (profile?.setup_wizard_done) {
      redirect("/dashboard/settings");
    }
    redirect("/dashboard/onboarding");
  }

  const profilePromise =
    currentCalendar.isOwner && !fromInvite
      ? getProfile(user.id)
      : Promise.resolve(null);
  const permissionsPromise = getCalendarPermissionsForUser(
    currentCalendar.id,
    user.id,
  );
  const [profile, permissions] = await Promise.all([
    profilePromise,
    permissionsPromise,
  ]);

  if (
    currentCalendar.isOwner &&
    !fromInvite &&
    !profile?.setup_wizard_done &&
    !isOnboardingPath
  ) {
    redirect("/dashboard/onboarding");
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[perf] dashboard_shell_layout", {
      calendarId: currentCalendar.id,
      isOwner: currentCalendar.isOwner,
    });
  }

  return (
    <DashboardProvider
      calendarId={currentCalendar.id}
      calendarName={currentCalendar.name ?? "メインカレンダー"}
      permissions={permissions}
      fromInvite={fromInvite}
    >
      {children}
    </DashboardProvider>
  );
}

