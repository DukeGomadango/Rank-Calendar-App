import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          カレンダーごとのイベント・共有・ロールなどを管理します。
        </p>
      </header>

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          カレンダー設定
        </h2>
        <ul className="space-y-1">
          <li>
            <Link
              href="/dashboard/settings/events"
              className="text-pink-500 underline-offset-2 hover:underline"
            >
              イベントマスタの管理
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/settings/sharing"
              className="text-pink-500 underline-offset-2 hover:underline"
            >
              共有・招待の管理
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

