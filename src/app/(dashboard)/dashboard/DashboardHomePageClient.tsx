"use client";

import { EnsureCalendarIdInUrl } from "@/components/dashboard/EnsureCalendarIdInUrl";
import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { DashboardHomeClient } from "@/components/dashboard/DashboardHomeClient";
import { ListenerWelcome } from "@/components/onboarding/ListenerWelcome";

type Props = {
  saveScheduleEntry: (formData: FormData) => Promise<void> | Promise<unknown>;
  applyRankUp: (calendarId: string) => Promise<void>;
  displayName: string | null;
};

export function DashboardHomePageClient({
  saveScheduleEntry,
  applyRankUp,
  displayName,
}: Props) {
  const { fromInvite, calendarId, calendarName, permissions } = useDashboardCalendar();
  const showInviteWelcome = fromInvite && !permissions.isOwner;

  return (
    <div className="space-y-6">
      <EnsureCalendarIdInUrl enforceMatch stripFromInvite={!showInviteWelcome} />
      {showInviteWelcome && (
        <ListenerWelcome
          calendarId={calendarId}
          calendarName={calendarName}
          displayName={displayName}
        />
      )}
      <section>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ダッシュボード
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          ログイン中のライバー用に、カレンダーのサマリをここに表示します。
        </p>
      </section>
      <DashboardHomeClient
        saveScheduleEntry={saveScheduleEntry}
        applyRankUp={applyRankUp}
      />
    </div>
  );
}

