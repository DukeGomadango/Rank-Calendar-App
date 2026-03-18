"use client";

import { EnsureCalendarIdInUrl } from "@/components/dashboard/EnsureCalendarIdInUrl";
import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";

export function SharingPageClient() {
  const { permissions } = useDashboardCalendar();

  return (
    <>
      <EnsureCalendarIdInUrl />
      {!permissions.isOwner && (
        <section className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          <p>共有設定はオーナー専用です。閲覧のみのリスナーはここで設定を変更できません。</p>
        </section>
      )}
    </>
  );
}


