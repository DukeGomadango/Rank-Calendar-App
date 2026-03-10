import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ログイン
        </h1>
        <p className="mb-6 text-xs text-zinc-600 dark:text-zinc-400">
          Google・Discord・メールリンクでログインできます。※実際の認証処理は後続ステップで実装します。
        </p>

        <div className="space-y-3 text-sm">
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-zinc-900 ring-1 ring-zinc-300 transition hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600 dark:hover:bg-zinc-700">
            Googleで続行
          </button>
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] px-4 py-2 text-zinc-50 transition hover:bg-[#4752c4]">
            Discordで続行
          </button>
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            メールリンクでログイン
          </button>
        </div>

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

