"use client";

import { useTransition } from "react";
import { RANK_ORDER, type RankLabel } from "@/lib/domain/rank";

type Props = {
  calendarId: string;
  currentRank: RankLabel | null;
  canRankUp: boolean;
  daysUntilReset: number | null;
  /** 次回リセット日（YYYY-MM-DD）。リセット日変更UI用。 */
  rankResetDate: string | null;
  onApplyRankUp: (calendarId: string) => Promise<void>;
  onUpdateCurrentRank: (calendarId: string, newRank: string | null) => Promise<void>;
  onUpdateRankResetDate: (calendarId: string, newResetDate: string) => Promise<void>;
};

export function DashboardRankSection({
  calendarId,
  currentRank,
  canRankUp,
  daysUntilReset,
  rankResetDate,
  onApplyRankUp,
  onUpdateCurrentRank,
  onUpdateRankResetDate,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [resetDatePending, startResetDateTransition] = useTransition();

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        現在のランク
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {currentRank != null ? (
          <>IRIAM の現在ランク: <strong>{currentRank}</strong></>
        ) : (
          "未設定（IRIAMアプリで確認し、下の「ランクを設定」で反映できます）"
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={(formData) => {
            const r = formData.get("rank");
            const rank = r === "" || r == null ? null : String(r);
            startTransition(() => onUpdateCurrentRank(calendarId, rank));
          }}
          className="inline-flex items-center gap-2"
        >
          <label htmlFor="rank-select" className="text-[11px] text-zinc-600 dark:text-zinc-400">
            ランクを設定
          </label>
          <select
            id="rank-select"
            name="rank"
            defaultValue={currentRank ?? ""}
            onChange={(e) => {
              const form = e.target.form;
              if (form) form.requestSubmit();
            }}
            disabled={isPending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] dark:border-zinc-600 dark:bg-zinc-900"
          >
            <option value="">—</option>
            {RANK_ORDER.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </form>
        {daysUntilReset != null && (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            あと {daysUntilReset} 日でリセット
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-700">
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
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] dark:border-zinc-600 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={resetDatePending}
            className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-[11px] transition hover:bg-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {resetDatePending ? "反映中…" : "反映"}
          </button>
        </form>
      </div>
      {canRankUp && (
        <form
          action={() => {
            startTransition(() => onApplyRankUp(calendarId));
          }}
          className="pt-1"
        >
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {isPending ? "反映中…" : "ランクアップを反映"}
          </button>
        </form>
      )}
    </section>
  );
}
