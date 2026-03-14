import { ViewModeToggle } from "@/components/settings/ViewModeToggle";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          表示などの設定を行います。
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          表示設定
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          リスナーで閲覧するときの表示の濃さを切り替えられます。簡易＝最小限の情報、詳細＝推しと同じ目線で表示（編集はできません）。
        </p>
        <ViewModeToggle />
      </section>
    </div>
  );
}

