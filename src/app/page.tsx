import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 rounded-2xl border border-zinc-200/60 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <section className="space-y-4">
          <p className="text-xs font-semibold tracking-wide text-pink-500">
            IRIAM rank planner (unofficial)
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            IRIAMランク管理を、もっと分かりやすく。
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            デイリーランクスコア、アンスコ、スキップパス、イベント情報をまとめて管理できる
            IRIAMライバー向けのスケジュール管理ツールです。
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            ※当サービスは非公式のスケジュール管理ツールであり、IRIAM運営会社とは一切関係ありません。
          </p>
        </section>

        <section className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-300 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            新規登録
          </Link>
        </section>

        <section className="grid gap-4 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/70">
            <h2 className="mb-1 text-xs font-semibold text-zinc-500">
              デイリーランクを見える化
            </h2>
            <p className="text-xs leading-relaxed">
              +2 / +4 / +6、アンスコ、スキップパス使用日を日別に記録し、「今週あとどれだけ必要か」が一目で分かります。
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/70">
            <h2 className="mb-1 text-xs font-semibold text-zinc-500">
              カレンダー &amp; テーブルビュー
            </h2>
            <p className="text-xs leading-relaxed">
              IRIAMのイベントスケジュールや目標+をカレンダー形式・Excelライクな表形式で切り替えて管理できます。
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/70">
            <h2 className="mb-1 text-xs font-semibold text-zinc-500">
              プライバシーを重視
            </h2>
            <p className="text-xs leading-relaxed">
              OCRで読み込んだ画像はブラウザ内でのみ処理され、サーバーには送信・保存されません。トラッキングも行っていません。
            </p>
          </div>
        </section>

        <section className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            利用規約
          </Link>
        </section>
      </main>
    </div>
  );
}
