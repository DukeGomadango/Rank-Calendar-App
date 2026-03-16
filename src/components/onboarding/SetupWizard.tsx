"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { toJstDateString } from "@/lib/domain/calendar";
import { RANK_ORDER } from "@/lib/domain/rank";
import { EVENT_PALETTE } from "@/lib/event-colors";
import {
  saveOnboardingStep1,
  saveOnboardingStep2,
  saveOnboardingStep3,
  saveOnboardingStep4,
  saveOnboardingStep5,
  saveOnboardingStep5AndFinish,
  finishOnboardingWithoutEvent,
} from "@/app/(dashboard)/dashboard/onboarding/actions";

const STEPS = [
  { id: 1, title: "ライバーネーム" },
  { id: 2, title: "現在のランク" },
  { id: 3, title: "スキップパス枚数" },
  { id: 4, title: "目標ランク" },
  { id: 5, title: "次のランクリセット日" },
  { id: 6, title: "直近のイベント（任意）" },
] as const;

type Props = {
  /** 保存済みのステップ（タブ切り替え後も途中から再開）
   */
  initialStep?: number;
  initialLiverName: string;
  initialCurrentRank: string;
  initialSkipPassCount: number;
  initialTargetRank: string;
  initialRankResetDate: string;
};

export function SetupWizard({
  initialStep = 1,
  initialLiverName,
  initialCurrentRank,
  initialSkipPassCount,
  initialTargetRank,
  initialRankResetDate,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(6, Math.max(1, initialStep)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDateInput, setResetDateInput] = useState(initialRankResetDate);

  const resetDaysRemaining = useMemo(() => {
    if (!resetDateInput) return null;
    const todayJst = toJstDateString(new Date());
    return dayjs(resetDateInput).diff(dayjs(todayJst), "day");
  }, [resetDateInput]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, next?: number) => {
    setError(null);
    setPending(true);
    try {
      const result = await fn();
      if (result.ok) {
        if (next != null) setStep(next);
        else router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error ?? "保存に失敗しました");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        セットアップ
      </h1>
      <div className="flex gap-2">
        {STEPS.map((s) => (
          <span
            key={s.id}
            className={`h-1 flex-1 rounded-full ${step >= s.id ? "bg-accent-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
            aria-hidden
          />
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      {step === 1 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await run(async () => saveOnboardingStep1(new FormData(e.currentTarget)), 2);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            あなたのライバーネームを教えてください。カレンダー名としても使います。
          </p>
          <input
            type="text"
            name="liver_name"
            defaultValue={initialLiverName}
            placeholder="例: 配信者名"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            maxLength={100}
            autoFocus
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "保存中…" : "次へ"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await run(async () => saveOnboardingStep2(new FormData(e.currentTarget)), 3);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            今のIRIAMランクを教えてください。
          </p>
          <select
            name="current_rank"
            defaultValue={initialCurrentRank}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">—</option>
            {RANK_ORDER.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "保存中…" : "次へ"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await run(async () => saveOnboardingStep3(new FormData(e.currentTarget)), 4);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            手持ちのスキップパスは何枚ですか？（0〜10）
          </p>
          <input
            type="number"
            name="skip_pass_count"
            min={0}
            max={10}
            defaultValue={initialSkipPassCount}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "保存中…" : "次へ"}
          </button>
        </form>
      )}

      {step === 4 && (
        <form
          action={async (fd) => {
            await run(async () => saveOnboardingStep4(fd), 5);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            目指す目標ランクを選んでください。
          </p>
          <select
            name="target_rank"
            defaultValue={initialTargetRank}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">—</option>
            {RANK_ORDER.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "保存中…" : "次へ"}
          </button>
        </form>
      )}

      {step === 5 && (
        <form
          action={async (fd) => {
            await run(async () => saveOnboardingStep5(fd), 6);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            IRIAM の次のランクリセット日を教えてください。
          </p>
          <input
            type="date"
            name="rank_reset_date"
            defaultValue={initialRankResetDate}
            onChange={(e) => setResetDateInput(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          {resetDaysRemaining != null && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              今日からあと{" "}
              <span className="font-medium">
                {resetDaysRemaining === 0
                  ? "0日（本日リセット）"
                  : `${resetDaysRemaining}日`}
              </span>
              でリセットされます。
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {pending ? "保存中…" : "次へ"}
          </button>
        </form>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            参加中または直近で参加するイベントがあれば登録できます。スキップしても大丈夫です。
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await run(() => saveOnboardingStep5AndFinish(new FormData(e.currentTarget)));
            }}
            className="space-y-3"
          >
            <input
              type="text"
              name="event_name"
              placeholder="イベント名"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              maxLength={200}
            />
            <div className="flex gap-2">
              <input
                type="date"
                name="event_start"
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <span className="self-center text-zinc-500">〜</span>
              <input
                type="date"
                name="event_end"
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <select
              name="event_color"
              defaultValue="rose"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {EVENT_PALETTE.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
              >
                {pending ? "登録中…" : "登録して完了"}
              </button>
              <button
                type="button"
                onClick={() => run(() => finishOnboardingWithoutEvent())}
                disabled={pending}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                スキップ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
