export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ダッシュボード
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          ここに今週のランク状況や今日の目標+、参加中イベントなどのダッシュボードを実装していきます。
        </p>
      </section>
      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        計画どおりの実装を進める中で、まずは Supabase 認証とカレンダー用データ構造を整えた後、このホーム画面に「今週の+サマリ」「直近7実働日のブロック表示」「今日のスケジュールカード」などを配置します。
      </section>
    </div>
  );
}

