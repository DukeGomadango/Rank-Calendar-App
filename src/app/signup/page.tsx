'use client';

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.24 1.26-.97 2.33-2.07 3.04l3.35 2.6C20.4 18.3 21.5 15.9 21.5 13c0-.64-.06-1.25-.18-1.84H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 13.7 5.9 14.2l-2.68 2.06C4.7 19.7 8.1 22 12 22c2.7 0 4.96-.9 6.6-2.4l-3.35-2.6c-.9.6-2.04.96-3.25.96-2.5 0-4.62-1.68-5.38-3.96z"
      />
      <path
        fill="#4A90E2"
        d="M4.22 7.86 1.54 5.8C.56 7.6.56 9.8 1.54 11.6l3.08-2.4c.76-2.28 2.88-3.96 5.38-3.96 1.21 0 2.35.36 3.25.96l2.36-2.36C16.96 2.9 14.7 2 12 2 8.1 2 4.7 4.3 3.08 7.86z"
      />
      <path
        fill="#FBBC05"
        d="M12 4.2c1.64 0 3.13.56 4.3 1.66L18.7 3.5C16.96 2 14.7 1 12 1 8.1 1 4.7 3.3 3.08 6.86l3.52 2.7C7.38 5.88 9.5 4.2 12 4.2z"
        opacity="0"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 71 55"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M60.1 4.9A58.2 58.2 0 0 0 46.6 1l-1.8 3.6a53.2 53.2 0 0 0-18 0L25 1a58.4 58.4 0 0 0-13.6 3.9C4.4 18.1 2.3 31 3 43.7A58.9 58.9 0 0 0 18 54l3.1-5.2a35.6 35.6 0 0 1-5.5-2.7l.7-.5c1 .7 2 1.3 3 1.8a39 39 0 0 0 34.4 0 36.5 36.5 0 0 0 3-1.8l.8.5c-1.8 1.1-3.6 2-5.5 2.7L53 54a58.8 58.8 0 0 0 15.1-10.3c1.2-13.1-.8-25.9-8-38.8zM24.5 36.8c-3 0-5.4-2.7-5.4-6.1s2.3-6.1 5.4-6.1c3 0 5.5 2.7 5.4 6.1 0 3.4-2.3 6.1-5.4 6.1zm22 0c-3 0-5.4-2.7-5.4-6.1s2.4-6.1 5.4-6.1c3 0 5.4 2.7 5.4 6.1s-2.4 6.1-5.4 6.1z"
      />
    </svg>
  );
}

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-accent-500 via-accent-400 to-accent-300/90 px-4 py-12 dark:from-accent-800 dark:via-accent-700 dark:to-accent-900/90">
      <div
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% -20%, #0ea5e9 0%, #38bdf8 30%, #7dd3fc 55%, transparent 80%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% -20%, #0369a1 0%, #075985 40%, transparent 75%)",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-sky-400/24 blur-3xl" />
        <div className="absolute bottom-[-3rem] right-[-4rem] h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-12 h-44 w-44 rounded-full bg-indigo-500/16 blur-3xl" />
      </div>
      <main className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white/85 p-6 text-xs shadow-2xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/85">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-accent-500 shadow-sm dark:bg-sky-900/40">
            <Sparkles className="h-6 w-6" strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-accent-600 dark:text-accent-300">
              IRIAM だんごスケジュール
            </p>
            <h1 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              アカウントを新規作成
            </h1>
          </div>
        </div>
        <p className="mb-6 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          IRIAMランク管理用のアカウントを作成します。IRIAM本体のアカウントとは連携していません。
        </p>

        <div className="space-y-3 text-sm">
          <button
            type="button"
            onClick={() => handleOAuthSignup("google")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-zinc-900 ring-1 ring-zinc-300 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600 dark:hover:bg-zinc-700"
          >
            <GoogleIcon />
            <span>Googleで登録</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignup("discord")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-[13px] font-medium text-zinc-50 transition hover:bg-[#4752c4]"
          >
            <DiscordIcon />
            <span>Discordで登録</span>
          </button>
          <div className="pt-3">
            <label className="mb-1 block text-[11px] text-zinc-600 dark:text-zinc-400">
              メールアドレスで登録
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 shadow-sm outline-none ring-accent-500 focus:border-accent-500 focus:ring-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
            className="font-medium text-accent-500 underline-offset-2 hover:underline"
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

