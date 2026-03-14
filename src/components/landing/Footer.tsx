import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-50/50 px-4 py-10 dark:border-zinc-800 dark:bg-zinc-900/30 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          当サービスは非公式です。IRIAM運営会社とは関係ありません。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link
            href="/privacy"
            className="text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/terms"
            className="text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            利用規約
          </Link>
        </div>
      </div>
    </footer>
  );
}
