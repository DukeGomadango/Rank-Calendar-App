"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNextRank, type RankLabel } from "@/lib/domain/rank";
import { useToast } from "@/lib/toast-context";
import { getRankBadgeClass } from "@/lib/rank-styles";

type Props = {
  currentRank: RankLabel | null;
  canRankUp: boolean;
  daysUntilReset: number | null;
  onApplyRankUp: (calendarId: string) => Promise<void>;
  calendarId: string;
};

export function CurrentRankBadge({
  currentRank,
  canRankUp,
  daysUntilReset,
  onApplyRankUp,
  calendarId,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [optimisticRank, setOptimisticRank] = useState<RankLabel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayRank = optimisticRank ?? currentRank;
  const badgeClass = getRankBadgeClass(displayRank);

  const handleApplyRankUp = () => {
    if (!canRankUp) return;
    setError(null);
    const next = getNextRank(currentRank);
    if (next != null) setOptimisticRank(next);
    setIsSubmitting(true);
    onApplyRankUp(calendarId)
      .then(() => {
        setOptimisticRank(null);
        setIsSubmitting(false);
        router.refresh();
        showToast("ランクアップを反映しました");
      })
      .catch(() => {
        setOptimisticRank(null);
        setIsSubmitting(false);
        setError("反映に失敗しました");
      });
  };

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs shadow-md dark:bg-slate-800">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        現在のランク
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={
            badgeClass
              ? `inline-flex min-w-[4rem] justify-center rounded-xl px-4 py-2.5 text-lg font-bold tabular-nums ${badgeClass}`
              : "inline-flex min-w-[4rem] justify-center rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-base font-medium text-zinc-600 dark:border-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
          }
          aria-label={displayRank ?? "未設定"}
        >
          {displayRank ?? "—"}
        </div>
        {daysUntilReset != null && (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            あと {daysUntilReset} 日でリセット
          </span>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400" role="alert">
          {error}
        </p>
      )}
      {canRankUp && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplyRankUp();
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {isSubmitting ? "反映中…" : "ランクアップを反映"}
          </button>
        </form>
      )}
    </section>
  );
}
