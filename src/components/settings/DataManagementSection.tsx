"use client";

import { useState } from "react";
import { exportCalendarCsv } from "@/app/(dashboard)/dashboard/settings/actions";

type Props = {
  calendarId: string;
  isMock: boolean;
};

export function DataManagementSection({ calendarId, isMock }: Props) {
  const [pending, setPending] = useState(false);

  async function handleExportCsv() {
    if (isMock) return;
    setPending(true);
    try {
      const result = await exportCalendarCsv(calendarId);
      if ("error" in result) {
        alert(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        データ管理
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        スケジュールデータをCSVでダウンロードできます。バックアップや他ツールでの利用にご利用ください。
      </p>
      {isMock ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          開発用モックではダウンロードできません。
        </p>
      ) : (
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={pending}
          className="rounded-md bg-accent-500 px-4 py-2 text-[12px] font-medium text-white hover:bg-accent-600 disabled:opacity-50 dark:bg-accent-600 dark:hover:bg-accent-700"
        >
          {pending ? "準備中…" : "CSVをダウンロード"}
        </button>
      )}
    </section>
  );
}
