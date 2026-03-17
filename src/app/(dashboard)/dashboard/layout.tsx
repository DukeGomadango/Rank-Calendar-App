import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentCalendarForUser,
  hasOwnedCalendar,
} from "@/lib/data/calendars";
import { getProfile } from "@/lib/data/profiles";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";

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

  const urlCalendarId = resolvedSp.calendarId ?? null;
  const fromInvite = resolvedSp.fromInvite === "1";

  if (!user) {
    redirect("/login");
  }

  const currentCalendar = await getCurrentCalendarForUser(
    user.id,
    urlCalendarId,
  );

  const isOwner = await hasOwnedCalendar(user.id);

  if (!currentCalendar && !fromInvite) {
    redirect("/dashboard/onboarding");
  }

  if (!currentCalendar) {
    redirect("/dashboard/settings");
  }

  if (isOwner && !fromInvite) {
    const profile = await getProfile(user.id);
    if (!profile?.setup_wizard_done) {
      redirect("/dashboard/onboarding");
    }
  }

  const permissions = await getCalendarPermissionsForUser(
    currentCalendar.id,
    user.id,
  );

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

