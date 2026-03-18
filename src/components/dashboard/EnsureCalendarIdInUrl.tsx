"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";

type Props = {
  /** fromInvite=1 など、残したいクエリがある場合に true */
  preserveExistingQuery?: boolean;
};

/**
 * /dashboard 配下で calendarId クエリを常に維持する。
 * 初回アクセスが calendarId なしでも、Provider が決めた calendarId を URL に反映することで、
 * タブ遷移・リロード・共有時の一貫性を保つ。
 */
export function EnsureCalendarIdInUrl({
  preserveExistingQuery = true,
}: Props) {
  const { calendarId } = useDashboardCalendar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const current = new URLSearchParams(searchParams?.toString() ?? "");
    if (current.get("calendarId") === calendarId) return;
    if (current.has("calendarId") && current.get("calendarId")) return;

    const next = preserveExistingQuery ? current : new URLSearchParams();
    next.set("calendarId", calendarId);

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [calendarId, pathname, preserveExistingQuery, router, searchParams]);

  return null;
}

