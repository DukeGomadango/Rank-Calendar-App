import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentCalendarForUser,
} from "@/lib/data/calendars";
import { getProfile } from "@/lib/data/profiles";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";

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
  const isInvitePendingPath = pathname.startsWith("/dashboard/invite-pending");
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

  if (isOnboardingPath || isInvitePendingPath) {
    return children;
  }

  let currentCalendar = await getCurrentCalendarForUser(
    user.id,
    urlCalendarId,
  );

  if (fromInvite && urlCalendarId && (!currentCalendar || currentCalendar.id !== urlCalendarId)) {
    redirect(`/dashboard/invite-pending?calendarId=${encodeURIComponent(urlCalendarId)}`);
  }

  if (!currentCalendar) {
    if (isSettingsPath) {
      return children;
    }
    if (fromInvite && urlCalendarId) {
      redirect(`/dashboard/invite-pending?calendarId=${encodeURIComponent(urlCalendarId)}`);
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

