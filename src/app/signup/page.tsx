'use client';

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createSupabaseBrowserClient();

  // 本番では NEXT_PUBLIC_APP_URL を設定すると確実（Vercel では https://あなたのドメイン.vercel.app など）
  const baseUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
      : undefined;
  const redirectTo = baseUrl
    ? `${baseUrl}/auth/callback?redirect_to=${
        searchParams.get("redirectTo") ?? "/dashboard"
      }`
    : undefined;

  const handleOAuthSignup = async (provider: "google" | "discord") => {
    setMessage(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
  };

  const handleMagicLinkSignup = () => {
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
        setMessage("登録用のメールを送信しました。メールボックスを確認してください。");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          新規登録
        </h1>
        <p className="mb-6 text-xs text-zinc-600 dark:text-zinc-400">
          IRIAMランク管理用のアカウントを作成します。IRIAM本体のアカウントとは連携していません。
        </p>

        <div className="space-y-3 text-sm">
          <button
            type="button"
            onClick={() => handleOAuthSignup("google")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-zinc-900 ring-1 ring-zinc-300 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600 dark:hover:bg-zinc-700"
          >
            Googleで登録
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignup("discord")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-zinc-50 transition hover:bg-[#4752c4]"
          >
            Discordで登録
          </button>
          <div className="pt-3">
            <label className="mb-1 block text-[11px] text-zinc-600 dark:text-zinc-400">
              メールアドレスで登録
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
              onClick={handleMagicLinkSignup}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              メールリンクで登録
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
          すでにアカウントをお持ちの方は{" "}
          <Link
            href="/login"
            className="font-medium text-pink-500 underline-offset-2 hover:underline"
          >
            ログイン
          </Link>
          へ。
        </p>
      </main>
    </div>
  );
}

function SignupFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          新規登録
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">読み込み中...</p>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}

