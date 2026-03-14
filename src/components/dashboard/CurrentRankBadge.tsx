"use client";

import { useTransition } from "react";
import type { RankLabel } from "@/lib/domain/rank";

function getRankTier(rank: RankLabel | null): "S" | "A" | "B" | "C" | "D" | null {
  if (rank == null) return null;
  if (rank.startsWith("S")) return "S";
  if (rank.startsWith("A")) return "A";
  if (rank.startsWith("B")) return "B";
  if (rank.startsWith("C")) return "C";
  return "D";
}

const TIER_STYLES: Record<
  string,
  { badge: string; label?: string }
> = {
  S: {
    badge:
      "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-md dark:from-amber-500 dark:via-yellow-500 dark:to-amber-700",
  },
  A: {
    badge:
      "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md dark:from-violet-600 dark:to-purple-700",
  },
  B: {
    badge:
      "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md dark:from-cyan-500 dark:to-blue-600",
  },
  C: {
    badge:
      "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md dark:from-emerald-600 dark:to-teal-700",
  },
  D: {
    badge:
      "bg-zinc-500 text-white shadow-md dark:bg-zinc-600 dark:text-zinc-100",
  },
};

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
  const [isPending, startTransition] = useTransition();
  const tier = getRankTier(currentRank);
  const style = tier != null ? TIER_STYLES[tier] : null;

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs shadow-md dark:bg-slate-800">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        現在のランク
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={
            style?.badge
              ? `inline-flex min-w-[4rem] justify-center rounded-xl px-4 py-2.5 text-lg font-bold tabular-nums ${style.badge}`
              : "inline-flex min-w-[4rem] justify-center rounded-xl border border-zinc-300 bg-accent-50 px-4 py-2.5 text-base font-medium text-accent-700 dark:border-slate-600 dark:bg-accent-950/40 dark:text-accent-200"
          }
          aria-label={currentRank ?? "未設定"}
        >
          {currentRank ?? "—"}
        </div>
        {daysUntilReset != null && (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            あと {daysUntilReset} 日でリセット
          </span>
        )}
      </div>
      {canRankUp && (
        <form
          action={() => {
            startTransition(() => onApplyRankUp(calendarId));
          }}
        >
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {isPending ? "反映中…" : "ランクアップを反映"}
          </button>
        </form>
      )}
    </section>
  );
}
