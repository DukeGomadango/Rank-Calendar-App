import { getNextRank, type RankLabel } from "@/lib/domain/rank";

type DayEntry = {
  date: string;
  actual_plus: number | null;
  skip_pass_used: boolean;
};

type WeeklyPlusSummaryProps = {
  totalPlus: number;
  maxPlus: number;
  weekStartJst: string;
  weekEndJst: string;
  canRankUpNextDay?: boolean;
  /** 現在ランク。S3 のときは「維持」文言にする。未指定ならランクアップ表記。 */
  currentRank?: RankLabel | null;
  reachedIntermediate?: boolean;
  /** あと○日でリセット（null のときは表示しない） */
  daysUntilReset?: number | null;
  /** 週内の日別エントリ（ミニスケジュール表示用）。未指定なら空で表示。 */
  weeklyEntries?: DayEntry[];
  /** 今日の日付（YYYY-MM-DD JST）。「今週のペース」で今日の箱をハイライトするために使用。 */
  todayJst?: string;
};

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 今週の+サマリ。大きな数値＋ドーナツチャートで視覚的に強調。
 * 背景リングは薄いブルー、進捗はグラデーションで「経験値バー」感を演出。
 * +12 で緑、+18 でゴールドのカラーフィードバック。
 */
export function WeeklyPlusSummary({
  totalPlus,
  maxPlus,
  weekStartJst,
  weekEndJst,
  canRankUpNextDay,
  currentRank,
  reachedIntermediate,
  daysUntilReset,
  weeklyEntries = [],
  todayJst,
}: WeeklyPlusSummaryProps) {
  /** S3 は維持 or 降格のみなので、ランクアップ文言を使わない */
  const isMaxRank = currentRank != null && getNextRank(currentRank) === null;

  const progressRatio = Math.max(
    0,
    Math.min(1, maxPlus === 0 ? 0 : totalPlus / maxPlus)
  );
  const size = 120;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progressRatio);

  const remaining = Math.max(0, maxPlus - totalPlus);
  const microCopy =
    canRankUpNextDay
      ? isMaxRank
        ? "＋18 達成！維持条件クリア 🎉"
        : "＋18 達成！翌日ランクアップ条件クリア 🎉"
      : remaining > 0
        ? isMaxRank
          ? `あと ＋${remaining} で維持`
          : `あと ＋${remaining} でランクアップ！`
        : null;
  const daysCopy =
    daysUntilReset != null && daysUntilReset > 0
      ? `今週の集計はあと ${daysUntilReset} 日！`
      : null;

  const ringGradientId =
    totalPlus >= maxPlus
      ? "weekly-plus-ring-gold"
      : totalPlus >= 12
        ? "weekly-plus-ring-green"
        : "weekly-plus-ring-gradient";

  const weekDates = (() => {
    const [y, m, d] = weekStartJst.split("-").map(Number);
    const base = new Date(y, m - 1, d);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    });
  })();
  const entryByDate = new Map(weeklyEntries.map((e) => [e.date, e]));

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        📊 今の集計周期の+サマリ（JST）
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        この集計周期の +実績合計です。スキップパス使用日は合計から除外し、+0
        の休み日は 0 としてカウントします。
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* ドーナツチャート（+12 緑 / +18 ゴールド）＋ 大きな数値 */}
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
                <linearGradient
                  id="weekly-plus-ring-green"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient
                  id="weekly-plus-ring-gold"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-sky-100 dark:text-slate-700"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={`url(#${ringGradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset,stroke] duration-500"
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
            {microCopy && (
              <p className="mt-1 text-[11px] font-medium text-accent-700 dark:text-accent-300">
                {microCopy}
              </p>
            )}
            {daysCopy && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {daysCopy}
              </p>
            )}
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
                ? isMaxRank
                  ? "+18 達成！維持条件クリア"
                  : "+18 達成！翌日ランクアップ条件クリア"
                : isMaxRank
                  ? "+18 で維持"
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
                ? "+12 以上（維持クリア）"
                : "+12 で維持"}
            </span>
          </div>
        </div>
      </div>

      {/* 1週間のペース配分（月〜日） */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          今週のペース
        </p>
        <div className="flex gap-1">
          {weekDates.map((date, i) => {
            const entry = entryByDate.get(date);
            const label = entry?.skip_pass_used
              ? "スキップ"
              : entry?.actual_plus != null
                ? `+${entry.actual_plus}`
                : "—";
            const isSkip = entry?.skip_pass_used === true;
            const hasPlus = entry && !entry.skip_pass_used && entry.actual_plus != null;
            const isToday = todayJst != null && date === todayJst;
            return (
              <div
                key={date}
                className={`flex flex-1 flex-col items-center rounded-lg border py-1.5 text-[10px] ${
                  isToday ? "ring-2 ring-accent-400 ring-offset-1 dark:ring-accent-400 dark:ring-offset-slate-800" : ""
                } ${
                  isSkip
                    ? "border-amber-300 bg-amber-50/80 dark:border-amber-600/50 dark:bg-amber-950/30"
                    : hasPlus
                      ? "border-sky-200 bg-sky-50/80 dark:border-sky-600/50 dark:bg-sky-950/30"
                      : "border-zinc-200 bg-zinc-50/50 dark:border-slate-600 dark:bg-slate-900/50"
                }`}
                title={date + (isToday ? "（今日）" : "")}
              >
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">
                  {WEEKDAY_LABELS[i]}
                </span>
                <span
                  className={`mt-0.5 font-medium tabular-nums ${
                    isSkip
                      ? "text-amber-700 dark:text-amber-300"
                      : hasPlus
                        ? "text-sky-700 dark:text-sky-300"
                        : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
