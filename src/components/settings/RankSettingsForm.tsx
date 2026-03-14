"use client";

import { useTransition } from "react";
import { RANK_ORDER, type RankLabel } from "@/lib/domain/rank";

type Props = {
  calendarId: string;
  currentRank: RankLabel | null;
  rankResetDate: string | null;
  onUpdateCurrentRank: (calendarId: string, newRank: string | null) => Promise<void>;
  onUpdateRankResetDate: (calendarId: string, newResetDate: string) => Promise<void>;
};

export function RankSettingsForm({
  calendarId,
  currentRank,
  rankResetDate,
  onUpdateCurrentRank,
  onUpdateRankResetDate,
}: Props) {
  const [rankPending, startRankTransition] = useTransition();
  const [resetDatePending, startResetDateTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={(formData) => {
            const r = formData.get("rank");
            const rank = r === "" || r == null ? null : String(r);
            startRankTransition(() => onUpdateCurrentRank(calendarId, rank));
          }}
          className="inline-flex items-center gap-2"
        >
          <label
            htmlFor="settings-rank-select"
            className="text-[11px] text-zinc-600 dark:text-zinc-400"
          >
            ランクを設定
          </label>
          <select
            id="settings-rank-select"
            name="rank"
            defaultValue={currentRank ?? ""}
            onChange={(e) => {
              const form = e.target.form;
              if (form) form.requestSubmit();
            }}
            disabled={rankPending}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[11px] dark:border-slate-600 dark:bg-slate-900 dark:text-zinc-50"
          >
            <option value="">—</option>
            {RANK_ORDER.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
          次回リセット日を合わせる（IRIAM とずれたとき用）
        </span>
        <form
          action={(formData) => {
            const date = formData.get("resetDate");
            if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
              startResetDateTransition(() =>
                onUpdateRankResetDate(calendarId, date)
              );
            }
          }}
          className="inline-flex items-center gap-2"
        >
          <input
            type="date"
            name="resetDate"
            defaultValue={rankResetDate ?? undefined}
            disabled={resetDatePending}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[11px] dark:border-slate-600 dark:bg-slate-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={resetDatePending}
            className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-[11px] transition hover:bg-zinc-200 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-zinc-200"
          >
            {resetDatePending ? "反映中…" : "反映"}
          </button>
        </form>
      </div>
    </div>
  );
}
