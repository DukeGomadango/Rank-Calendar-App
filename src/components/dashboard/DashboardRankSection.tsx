"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RANK_ORDER, getNextRank, type RankLabel } from "@/lib/domain/rank";
import { useToast } from "@/lib/toast-context";

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
  const router = useRouter();
  const { showToast } = useToast();
  const [optimisticRank, setOptimisticRank] = useState<RankLabel | null>(null);
  const [rankUpSubmitting, setRankUpSubmitting] = useState(false);
  const [rankUpError, setRankUpError] = useState<string | null>(null);
  const [rankSelectPending, startRankSelectTransition] = useTransition();
  const [resetDatePending, startResetDateTransition] = useTransition();
  const displayRank = optimisticRank ?? currentRank;

  const handleApplyRankUp = () => {
    if (!canRankUp) return;
    setRankUpError(null);
    const next = getNextRank(currentRank);
    if (next != null) setOptimisticRank(next);
    setRankUpSubmitting(true);
    onApplyRankUp(calendarId)
      .then(() => {
        setOptimisticRank(null);
        setRankUpSubmitting(false);
        router.refresh();
        showToast("ランクアップを反映しました");
      })
      .catch(() => {
        setOptimisticRank(null);
        setRankUpSubmitting(false);
        setRankUpError("反映に失敗しました");
      });
  };

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        現在のランク
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {displayRank != null ? (
          <>IRIAM の現在ランク: <strong>{displayRank}</strong></>
        ) : (
          "未設定（IRIAMアプリで確認し、下の「ランクを設定」で反映できます）"
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={(formData) => {
            const r = formData.get("rank");
            const rank = r === "" || r == null ? null : String(r);
            startRankSelectTransition(() => onUpdateCurrentRank(calendarId, rank));
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
            disabled={rankSelectPending}
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
      {rankUpError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400" role="alert">
          {rankUpError}
        </p>
      )}
      {canRankUp && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplyRankUp();
          }}
          className="pt-1"
        >
          <button
            type="submit"
            disabled={rankUpSubmitting}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {rankUpSubmitting ? "反映中…" : "ランクアップを反映"}
          </button>
        </form>
      )}
    </section>
  );
}
