"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  Calendar,
  BarChart3,
  Gift,
  Share2,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/dashboard/calendar", label: "カレンダー", icon: Calendar },
  { href: "/dashboard/data", label: "データ", icon: BarChart3 },
  { href: "/dashboard/events", label: "イベント", icon: Gift },
  { href: "/dashboard/sharing", label: "共有", icon: Share2 },
  { href: "/dashboard/settings", label: "設定", icon: Settings },
];

const ICON_SIZE = 18;
const ICON_SIZE_BOTTOM = 20;

type Props = {
  isOwner: boolean;
  /** 表示中のカレンダーがこの一覧に含まれるときだけ「共有」タブを表示する（リスナーに切り替えたときは非表示） */
  ownedCalendarIds: string[];
  variant: "sidebar" | "drawer" | "bottom";
  onLinkClick?: () => void;
};

function buildHref(
  path: string,
  searchParams: URLSearchParams,
  calendarId: string | null,
): string {
  const next = new URLSearchParams(searchParams.toString());
  if (calendarId) next.set("calendarId", calendarId);
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

export function DashboardNavLinks({
  isOwner,
  ownedCalendarIds,
  variant,
  onLinkClick,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const spString = searchParams?.toString() ?? "";
  const sp = new URLSearchParams(spString);
  const calendarId = searchParams.get("calendarId");

  const showSharing =
    calendarId != null
      ? ownedCalendarIds.includes(calendarId)
      : isOwner;

  const items = NAV_ITEMS.filter(
    (item) => item.href !== "/dashboard/sharing" || showSharing
  );

  useEffect(() => {
    const targets = ["/dashboard", "/dashboard/calendar", "/dashboard/data"]
      .filter((href) => href !== pathname)
      .map((href) => buildHref(href, new URLSearchParams(spString), calendarId));
    for (const href of targets) {
      router.prefetch(href);
    }
  }, [calendarId, pathname, router, spString]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const linkBase =
    "flex items-center gap-3 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 dark:focus-visible:ring-accent-500";
  const linkInactive =
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
  const linkActive =
    "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50";

  if (variant === "bottom") {
    return (
      <ul className="flex items-stretch justify-between gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={buildHref(href, sp, calendarId)}
                prefetch
                onClick={onLinkClick}
                onMouseEnter={() => {
                  const target = buildHref(href, sp, calendarId);
                  router.prefetch(target);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 dark:focus-visible:ring-accent-500 ${
                  active
                    ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <Icon
                  size={ICON_SIZE_BOTTOM}
                  strokeWidth={1.8}
                  aria-hidden
                  className="shrink-0"
                />
                <span className="text-[10px]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const padding = variant === "sidebar" ? "px-2 py-1.5 text-xs" : "px-2 py-2 text-xs";

  return (
    <nav
      className={variant === "sidebar" ? "space-y-2" : "space-y-1"}
      aria-label="メインメニュー"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={buildHref(href, sp, calendarId)}
            prefetch
            onClick={onLinkClick}
            onMouseEnter={() => {
              const target = buildHref(href, sp, calendarId);
              router.prefetch(target);
            }}
            className={`${linkBase} ${padding} ${
              active ? linkActive : linkInactive
            }`}
          >
            <Icon
              size={ICON_SIZE}
              strokeWidth={1.8}
              aria-hidden
              className="shrink-0"
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
