"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";

type Props = {
  /** fromInvite=1 など、残したいクエリがある場合に true */
  preserveExistingQuery?: boolean;
  /** true の場合、URL 上の calendarId が Provider と不一致でも補正する */
  enforceMatch?: boolean;
};

/**
 * /dashboard 配下で calendarId クエリを常に維持する。
 * 初回アクセスが calendarId なしでも、Provider が決めた calendarId を URL に反映することで、
 * タブ遷移・リロード・共有時の一貫性を保つ。
 */
export function EnsureCalendarIdInUrl({
  preserveExistingQuery = true,
  enforceMatch = false,
}: Props) {
  const { calendarId } = useDashboardCalendar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const current = new URLSearchParams(searchParams?.toString() ?? "");
    const currentCalendarId = current.get("calendarId");
    if (currentCalendarId === calendarId) return;
    if (!enforceMatch && current.has("calendarId") && currentCalendarId) return;

    const next = preserveExistingQuery ? current : new URLSearchParams();
    next.set("calendarId", calendarId);

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [calendarId, enforceMatch, pathname, preserveExistingQuery, router, searchParams]);

  return null;
}

