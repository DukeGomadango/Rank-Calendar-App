\"use client\";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveCalendar } from "@/app/(dashboard)/dashboard/settings/actions";

type Props = {
  calendarId: string;
  calendarName: string;
};

export function LeaveCalendarSection({ calendarId, calendarName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLeave() {
    if (pending) return;
    if (
      !confirm(
        `${calendarName} から抜けますか？\\n\\nこのカレンダーはダッシュボードから表示できなくなります。再度参加するには、オーナーから新しい招待リンクを発行してもらう必要があります。`
      )
    ) {
      return;
    }

    setPending(true);
    try {
      const result = await leaveCalendar(calendarId);
      if (!result.ok) {
        alert(result.error ?? "共有の解除に失敗しました");
        return;
      }
      router.push("/dashboard/settings");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        このカレンダーから抜ける
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        このカレンダーとの共有を解除します。アカウントや他のカレンダーには影響しません。
      </p>
      <button
        type="button"
        onClick={handleLeave}
        disabled={pending}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-[12px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
      >
        {pending ? "処理中…" : "このカレンダーから抜ける"}
      </button>
    </section>
  );
}

