'use client';

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createSupabaseBrowserClient();

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?redirect_to=${
          searchParams.get("redirectTo") ?? "/dashboard"
        }`
      : undefined;

  const handleOAuthLogin = async (provider: "google" | "discord") => {
    setMessage(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
  };

  const handleMagicLink = () => {
    if (!email) {
      setMessage("メールアドレスを入力してください。");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) {
        setMessage(`メール送信に失敗しました: ${error.message}`);
      } else {
        setMessage("ログイン用のメールを送信しました。メールボックスを確認してください。");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ログイン
        </h1>
        <p className="mb-6 text-xs text-zinc-600 dark:text-zinc-400">
          Google・Discord・メールリンクでログインできます。
        </p>

        <div className="space-y-3 text-sm">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-zinc-900 ring-1 ring-zinc-300 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600 dark:hover:bg-zinc-700"
          >
            Googleで続行
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin("discord")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-zinc-50 transition hover:bg-[#4752c4]"
          >
            Discordで続行
          </button>

          <div className="pt-3">
            <label className="mb-1 block text-[11px] text-zinc-600 dark:text-zinc-400">
              メールアドレスでログイン
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 shadow-sm outline-none ring-pink-500 focus:border-pink-500 focus:ring-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="example@example.com"
            />
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              メールリンクでログイン
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-4 text-[11px] text-zinc-500 dark:text-zinc-400">
            {message}
          </p>
        )}

        <p className="mt-6 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          ※当サービスは非公式のスケジュール管理ツールであり、IRIAM運営会社とは一切関係ありません。
        </p>

        <p className="mt-4 text-[11px] text-zinc-500 dark:text-zinc-400">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="font-medium text-pink-500 underline-offset-2 hover:underline"
          >
            新規登録
          </Link>
          へ。
        </p>
      </main>
    </div>
  );
}

