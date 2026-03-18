"use client";

import { EnsureCalendarIdInUrl } from "@/components/dashboard/EnsureCalendarIdInUrl";
import { DashboardHomeClient } from "@/components/dashboard/DashboardHomeClient";

type Props = {
  saveScheduleEntry: (formData: FormData) => Promise<void> | Promise<unknown>;
  applyRankUp: (calendarId: string) => Promise<void>;
};

export function DashboardHomePageClient({
  saveScheduleEntry,
  applyRankUp,
}: Props) {
  return (
    <div className="space-y-6">
      <EnsureCalendarIdInUrl />
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

