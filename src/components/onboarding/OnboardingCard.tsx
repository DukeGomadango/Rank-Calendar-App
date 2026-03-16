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

  const handleStart = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
      const card = document.getElementById("home-schedule-card");
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
        const firstField = card.querySelector<HTMLElement>(
          "input, select, textarea, button"
        );
        if (firstField) {
          firstField.focus();
        }
      }
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-label="はじめてのご利用案内"
      className="rounded-2xl bg-white p-4 text-xs shadow-md dark:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            ようこそ！スクショ一発でランク管理をはじめましょう
          </h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            まずは右側の「今日のスケジュールを登録」フォームから、今日の予定を1つだけ登録してみましょう。
          </p>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            IRIAMのランキング画面のスクショを読み込むと、ボーダーなどを自動入力できます。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleStart}
            className="shrink-0 rounded-xl bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-600"
          >
            今日の予定を登録する
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="説明を閉じる"
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            ×
          </button>
        </div>
      </div>
    </section>
  );
}
