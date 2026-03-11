"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "iriam_onboarding_done";

export function OnboardingCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-label="はじめてのご利用案内"
      className="rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 to-white p-4 text-xs shadow-sm dark:border-pink-800 dark:from-pink-950/40 dark:to-zinc-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            ようこそ！IRIAM ランク管理をはじめましょう
          </h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            このアプリでは、デイリーランクの目標+・実績+・ボーダーを日別に記録し、週ごとの+合計でランクアップの目安を確認できます。
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">目標+ / 実績+</strong>：その日の目標と実際の+（0/1/2/4/6）
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">ボーダー</strong>：+2 / +4 / +6 のライン
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">スキップパス</strong>：使用日は週の+集計から除外
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">週+18</strong>：翌日ランクアップの目安
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-md bg-pink-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-pink-600"
        >
          はじめる
        </button>
      </div>
    </section>
  );
}
