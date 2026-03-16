"use client";

import { useRouter } from "next/navigation";
import type { AccessibleCalendarRow } from "@/lib/data/calendars";

type Props = {
  calendars: AccessibleCalendarRow[];
  currentCalendarId: string;
  basePath?: string;
  /** リスナーで1件のみのときに「マイカレンダーを作成」で呼ぶサーバーアクション */
  createMyCalendarAction?: () => Promise<void>;
};

export function CalendarSwitcher({
  calendars,
  currentCalendarId,
  basePath = "/dashboard/settings",
  createMyCalendarAction,
}: Props) {
  const router = useRouter();

  const showSection =
    calendars.length > 1 ||
    (calendars.length === 1 && !calendars[0].isOwner);
  if (!showSection) return null;

  const isListenerOnlyOne = calendars.length === 1 && !calendars[0].isOwner;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const url = `${basePath}?calendarId=${encodeURIComponent(id)}`;
    router.push(url);
  };

  return (
    <section className="space-y-2 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        表示するカレンダー
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        ホーム・カレンダー・データなどで表示するカレンダーを切り替えます。
      </p>
      {isListenerOnlyOne ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
            {calendars[0].name?.trim() || "（名前なし）"} （共有）
          </p>
          {createMyCalendarAction && (
            <form action={createMyCalendarAction}>
              <button
                type="submit"
                className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              >
                マイカレンダーを作成
              </button>
            </form>
          )}
        </div>
      ) : (
        <select
          value={currentCalendarId}
          onChange={handleChange}
          className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-500 dark:focus:ring-accent-600"
          aria-label="表示するカレンダーを選択"
        >
          {calendars.map((cal) => (
            <option key={cal.id} value={cal.id}>
              {cal.name?.trim() || "（名前なし）"}
              {cal.isOwner ? " （マイカレンダー）" : " （共有）"}
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
