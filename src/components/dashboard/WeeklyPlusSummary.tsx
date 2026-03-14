type WeeklyPlusSummaryProps = {
  totalPlus: number;
  maxPlus: number;
  weekStartJst: string;
  weekEndJst: string;
  canRankUpNextDay?: boolean;
  reachedIntermediate?: boolean;
};

/**
 * 今週の+サマリ。大きな数値＋ドーナツチャートで視覚的に強調。
 * 背景リングは薄いブルー、進捗はグラデーションで「経験値バー」感を演出。
 */
export function WeeklyPlusSummary({
  totalPlus,
  maxPlus,
  weekStartJst,
  weekEndJst,
  canRankUpNextDay,
  reachedIntermediate,
}: WeeklyPlusSummaryProps) {
  const progressRatio = Math.max(
    0,
    Math.min(1, maxPlus === 0 ? 0 : totalPlus / maxPlus)
  );
  const size = 120;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progressRatio);

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        📊 今週の+サマリ（JST）
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        月曜はじまりの 1 週間ぶんの +実績合計です。スキップパス使用日は合計から除外し、+0
        の休み日は 0 としてカウントします。
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* ドーナツチャート（背景は薄いブルー、進捗はグラデーション）＋ 大きな数値 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              className="rotate-[-90deg]"
              aria-hidden
            >
              <defs>
                <linearGradient
                  id="weekly-plus-ring-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="var(--weekly-ring-start, #38bdf8)" />
                  <stop offset="50%" stopColor="var(--weekly-ring-mid, #0ea5e9)" />
                  <stop offset="100%" stopColor="var(--weekly-ring-end, #0284c7)" />
                </linearGradient>
              </defs>
              {/* 背景リング: ライトは薄いブルー、ダークは薄いグレーで軌跡を表現 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-sky-100 dark:text-slate-700"
              />
              {/* 進捗リング: グラデーションでゲージが溜まる感 */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="url(#weekly-plus-ring-gradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-500"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {weekStartJst} 〜 {weekEndJst}
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className="text-3xl font-bold tabular-nums text-accent-600 dark:text-accent-300"
                aria-label={`今週の実績+ 合計 ${totalPlus}`}
              >
                {totalPlus}
              </span>
              <span className="text-xl font-semibold text-zinc-400 dark:text-zinc-500">
                /
              </span>
              <span
                className="text-2xl font-bold tabular-nums text-zinc-700 dark:text-zinc-300"
                aria-label={`目標 ${maxPlus}`}
              >
                {maxPlus}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              今週の実績+ 合計
            </p>
          </div>
        </div>
        {/* 横棒（モバイル用サブ）＋バッジ */}
        <div className="min-w-0 flex-1 space-y-2 rounded-xl bg-zinc-50/80 p-3 dark:bg-slate-900/50">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-slate-700 sm:hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-accent-500 to-accent-600 transition-[width] dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={
                canRankUpNextDay
                  ? "inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : "inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
              }
            >
              {canRankUpNextDay
                ? "+18 達成！翌日ランクアップ条件クリア"
                : "+18 で翌日ランクアップ"}
            </span>
            <span
              className={
                reachedIntermediate
                  ? "inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                  : "inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
              }
            >
              {reachedIntermediate
                ? "+12 以上（中間目標クリア）"
                : "+12 で中間目標"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
