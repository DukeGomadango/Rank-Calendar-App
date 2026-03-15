import Link from "next/link";

export function AppAboutSection() {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        アプリについて
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        利用規約・プライバシーポリシーおよびお問い合わせは以下からご確認ください。
      </p>
      <ul className="flex flex-col gap-1.5">
        <li>
          <Link
            href="/terms"
            className="text-accent-600 underline hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            利用規約
          </Link>
        </li>
        <li>
          <Link
            href="/privacy"
            className="text-accent-600 underline hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            プライバシーポリシー
          </Link>
        </li>
        <li>
          <a
            href="mailto:support@example.com"
            className="text-accent-600 underline hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
          >
            お問い合わせ・バグ報告
          </a>
        </li>
      </ul>
    </section>
  );
}
