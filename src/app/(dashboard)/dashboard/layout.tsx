import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentCalendarForUser,
} from "@/lib/data/calendars";
import { getProfile } from "@/lib/data/profiles";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";

const DASHBOARD_CALENDAR_COOKIE = "iriam_dashboard_calendar_id";

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

  const cookieStore = await cookies();
  const cookieCalendarId = cookieStore.get(DASHBOARD_CALENDAR_COOKIE)?.value?.trim() || null;
  const urlCalendarId = resolvedSp.calendarId ?? cookieCalendarId ?? null;
  const fromInvite = resolvedSp.fromInvite === "1";

  if (!user) {
    redirect("/login");
  }

  const currentCalendar = await getCurrentCalendarForUser(
    user.id,
    urlCalendarId,
  );

  if (!currentCalendar && !fromInvite) {
    redirect("/dashboard/onboarding");
  }

  if (!currentCalendar) {
    redirect("/dashboard/settings");
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

  if (currentCalendar.isOwner && !fromInvite && !profile?.setup_wizard_done) {
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

