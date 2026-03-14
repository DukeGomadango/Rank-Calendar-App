import Link from "next/link";

const STEPS = [
  {
    step: 1,
    title: "アカウントを作成",
    description: "新規登録でメールアドレスまたはOAuthでサインアップ。すぐに使い始められます。",
  },
  {
    step: 2,
    title: "スケジュールを登録",
    description:
      "ホームやカレンダー・データタブで、日付ごとに目標+・実績+・ボーダー・スキップパスを入力。イベントも登録できます。",
  },
  {
    step: 3,
    title: "必要なら共有",
    description:
      "共有タブでロールを作成し、招待リンクを発行。リスナーに権限を付与して、スケジュールを安全に共有できます。",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-zinc-200/80 bg-zinc-50/30 px-4 py-20 dark:border-zinc-800 dark:bg-zinc-900/20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            使い方
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            3ステップではじめられます。
          </p>
        </div>
        <div className="mt-16 grid gap-10 sm:grid-cols-3 lg:mt-20">
          {STEPS.map((item) => (
            <div key={item.step} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-lg font-bold text-white">
                {item.step}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
              {item.step < 3 && (
                <div className="absolute left-6 top-12 hidden h-0.5 w-[calc(100%-3rem)] bg-zinc-200 dark:bg-zinc-700 sm:block lg:left-16 lg:w-[calc(100%-4rem)]" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-amber-400 px-8 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300 dark:bg-amber-400 dark:text-slate-900 dark:hover:bg-amber-300"
          >
            無料ではじめる
          </Link>
        </div>
      </div>
    </section>
  );
}
