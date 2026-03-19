"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";

type Props = {
  /** fromInvite=1 など、残したいクエリがある場合に true */
  preserveExistingQuery?: boolean;
  /** true の場合、URL 上の calendarId が Provider と不一致でも補正する */
  enforceMatch?: boolean;
  /** true の場合、fromInvite クエリをURLから除去する（初回遷移後のループ抑止） */
  stripFromInvite?: boolean;
};

/**
 * /dashboard 配下で calendarId クエリを常に維持する。
 * 初回アクセスが calendarId なしでも、Provider が決めた calendarId を URL に反映することで、
 * タブ遷移・リロード・共有時の一貫性を保つ。
 */
export function EnsureCalendarIdInUrl({
  preserveExistingQuery = true,
  enforceMatch = false,
  stripFromInvite = true,
}: Props) {
  const { calendarId } = useDashboardCalendar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastReplaceTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const current = new URLSearchParams(searchParams?.toString() ?? "");
    const currentCalendarId = current.get("calendarId");
    if (currentCalendarId === calendarId) return;
    if (!enforceMatch && current.has("calendarId") && currentCalendarId) return;

    const next = preserveExistingQuery ? current : new URLSearchParams();
    if (stripFromInvite && next.has("fromInvite")) {
      next.delete("fromInvite");
    }
    next.set("calendarId", calendarId);

    const query = next.toString();
    const target = query ? `${pathname}?${query}` : pathname;

    // 同一ターゲットへの連続 replace を防ぎ、外部スクリプト干渉時の遷移スパムを抑止する。
    if (lastReplaceTargetRef.current === target) return;
    if (typeof window !== "undefined") {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl === target) return;
    }

    lastReplaceTargetRef.current = target;
    router.replace(target);
  }, [calendarId, enforceMatch, pathname, preserveExistingQuery, router, searchParams, stripFromInvite]);

  return null;
}

