"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayNameAction } from "@/app/(dashboard)/dashboard/settings/actions";

const WELCOME_KEY = "iriam_welcome_shown_";

type Props = {
  /** 招待元カレンダーID（fromInvite=1 のときのみ渡す） */
  calendarId: string;
  calendarName: string | null;
  displayName: string | null;
};

export function ListenerWelcome({ calendarId, calendarName, displayName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "welcome" | "done">("done");
  const [displayNameValue, setDisplayNameValue] = useState(displayName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarId) return;
    const key = WELCOME_KEY + calendarId;
    if (typeof window !== "undefined" && localStorage.getItem(key)) {
      setStep("done");
      return;
    }
    if (displayName?.trim()) {
      setStep("welcome");
    } else {
      setStep("name");
    }
  }, [calendarId, displayName]);

  const handleDismissWelcome = () => {
    if (typeof window !== "undefined" && calendarId) {
      localStorage.setItem(WELCOME_KEY + calendarId, "1");
    }
    setStep("done");
    router.replace("/dashboard", { scroll: false });
  };

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData();
    fd.set("display_name", displayNameValue);
    try {
      const result = await updateDisplayNameAction(fd);
      if (result.ok) {
        setStep("welcome");
        router.refresh();
      } else {
        setError(result.error ?? "保存に失敗しました");
      }
    } finally {
      setPending(false);
    }
  };

  if (!showFlow || step === "done") return null;

  const name = (calendarName?.trim() || "このカレンダー").replace(/"/g, "");

  if (step === "name") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            表示名を入力
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            アプリ内で表示される名前を教えてください。
          </p>
          <form onSubmit={handleSubmitName} className="mt-4 space-y-3">
            <input
              type="text"
              value={displayNameValue}
              onChange={(e) => setDisplayNameValue(e.target.value)}
              placeholder="表示名"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              maxLength={100}
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
            >
              {pending ? "保存中…" : "保存して次へ"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 text-center">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {name}の作戦会議室へようこそ！
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          一緒にS帯を目指しましょう！
        </p>
        <button
          type="button"
          onClick={handleDismissWelcome}
          className="mt-4 w-full rounded-xl bg-accent-500 py-2.5 text-sm font-medium text-white hover:bg-accent-600"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
