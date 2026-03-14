const FEATURES = [
  {
    title: "デイリーランクを見える化",
    description:
      "+2 / +4 / +6、アンスコ、スキップパス使用日を日別に記録し、「今週あとどれだけ必要か」が一目で分かります。週の+合計でランクアップの目安も確認できます。",
    icon: "chart",
  },
  {
    title: "カレンダー & データ表",
    description:
      "IRIAMのイベントスケジュールや目標+を、カレンダー形式とExcelライクな表形式で切り替えて管理。月・週のナビで過去・未来の予定もすぐ確認できます。",
    icon: "calendar",
  },
  {
    title: "リスナーへの共有",
    description:
      "招待リンクでリスナーを招待し、ロールごとに「何を見せるか」を権限で設定。簡易表示・詳細表示の切り替えで、推しと同じ目線で共有することもできます。",
    icon: "share",
  },
  {
    title: "プライバシーを重視",
    description:
      "OCRで読み込んだ画像はブラウザ内でのみ処理され、サーバーには送信・保存されません。トラッキングも行っていません。",
    icon: "lock",
  },
];

function FeatureIcon({ name }: { name: string }) {
  const className = "h-8 w-8 text-accent-500 dark:text-accent-400";
  switch (name) {
    case "chart":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case "share":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.934-2.185 2.25 2.25 0 00-3.934 2.185z" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    default:
      return null;
  }
}

const cardBase =
  "rounded-2xl border border-zinc-200/80 border-l-4 border-l-accent-500 bg-white p-6 shadow-sm transition hover:border-accent-200 hover:shadow-md dark:border-zinc-800 dark:border-l-accent-600 dark:bg-zinc-900/50 dark:hover:border-accent-900/50";

export function Features() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28" id="features">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            機能
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            ランク管理に必要な機能を、シンプルにまとめました。
          </p>
        </div>
        {/* 2×2 グリッド（PC時は4枚均等で収まりよく） */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-20 lg:gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={`${cardBase} flex flex-col`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-950/50">
                <FeatureIcon name={feature.icon} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 lg:text-xl">
                {feature.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
