/**
 * IRIAM ランクの共通カラーイメージ（D〜S で寒色→暖色）。
 * 期間バー・ランクバッジなどで共通利用する。
 * D=濃い青, C=水色, B=紫, A=ピンク, S=赤
 */

export type RankTier = "D" | "C" | "B" | "A" | "S";

/** ランクラベルからティア（D/C/B/A/S）を返す */
export function getRankTier(rank: string | null): RankTier | null {
  if (rank == null || rank.length === 0) return null;
  const first = rank.charAt(0).toUpperCase();
  if (first === "S") return "S";
  if (first === "A") return "A";
  if (first === "B") return "B";
  if (first === "C") return "C";
  if (first === "D") return "D";
  return null;
}

/** 期間バー用（カレンダー内の薄い帯）。bg と text を組み合わせて使用 */
export const RANK_TIER_BAR: Record<
  RankTier,
  { bg: string; text: string }
> = {
  D: {
    bg: "bg-blue-700/50 dark:bg-blue-900/50",
    text: "text-blue-100 dark:text-blue-200",
  },
  C: {
    bg: "bg-sky-300/60 dark:bg-sky-800/50",
    text: "text-sky-800 dark:text-sky-200",
  },
  B: {
    bg: "bg-violet-300/60 dark:bg-violet-800/50",
    text: "text-violet-800 dark:text-violet-200",
  },
  A: {
    bg: "bg-pink-300/60 dark:bg-pink-800/50",
    text: "text-pink-800 dark:text-pink-200",
  },
  S: {
    bg: "bg-red-400/60 dark:bg-red-800/50",
    text: "text-red-900 dark:text-red-200",
  },
};

/** 期間バー用のクラス文字列を返す（rank が null のときはニュートラル） */
export function getRankBarClasses(rank: string | null): string {
  const tier = getRankTier(rank);
  if (tier == null) {
    return "bg-zinc-200/60 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300";
  }
  const { bg, text } = RANK_TIER_BAR[tier];
  return `${bg} ${text}`;
}

/** 極細ライン用：4px 線の背景色のみ（セル上部の細いカラーライン用） */
export function getRankBarLineClass(rank: string | null): string {
  const tier = getRankTier(rank);
  if (tier == null) return "bg-zinc-300 dark:bg-zinc-600";
  return RANK_TIER_BAR[tier].bg;
}

/** 極細ライン横のラベル用：文字色のみ */
export function getRankBarTextClass(rank: string | null): string {
  const tier = getRankTier(rank);
  if (tier == null) return "text-zinc-600 dark:text-zinc-400";
  return RANK_TIER_BAR[tier].text;
}

/** 予測ランク用：点線の極細ライン（border-top dashed）。淡めの色で実線と差別化 */
const RANK_TIER_BORDER_DASHED: Record<RankTier, string> = {
  D: "border-blue-300 dark:border-blue-600/70",
  C: "border-sky-300 dark:border-sky-600/70",
  B: "border-violet-300 dark:border-violet-600/70",
  A: "border-pink-300 dark:border-pink-600/70",
  S: "border-red-300 dark:border-red-600/70",
};

export function getRankBarDashedLineClass(rank: string | null): string {
  const tier = getRankTier(rank);
  if (tier == null) return "border-t-4 border-dashed border-zinc-300 dark:border-zinc-600";
  return `border-t-4 border-dashed ${RANK_TIER_BORDER_DASHED[tier]}`;
}

/** 点線の色のみ（太さは呼び出し元で border-t-2 md:border-t-4 など指定）。モバイルで華奢にする用 */
export function getRankBarDashedLineColorClass(rank: string | null): string {
  const tier = getRankTier(rank);
  if (tier == null) return "border-dashed border-zinc-300 dark:border-zinc-600";
  return `border-dashed ${RANK_TIER_BORDER_DASHED[tier]}`;
}

/** カギカッコ風：ランクバー左右の縦線（┌─┐ の垂らし）。通常 */
const RANK_TIER_VERT: Record<RankTier, string> = {
  D: "border-blue-400 dark:border-blue-600",
  C: "border-sky-400 dark:border-sky-600",
  B: "border-violet-400 dark:border-violet-600",
  A: "border-pink-400 dark:border-pink-600",
  S: "border-red-400 dark:border-red-600",
};

/** フェーズ境界用：縦線を少し濃く */
const RANK_TIER_VERT_STRONG: Record<RankTier, string> = {
  D: "border-blue-600 dark:border-blue-500",
  C: "border-sky-500 dark:border-sky-500",
  B: "border-violet-500 dark:border-violet-500",
  A: "border-pink-500 dark:border-pink-500",
  S: "border-red-500 dark:border-red-500",
};

export function getRankBarVerticalBorderClass(rank: string | null, strong: boolean): string {
  const tier = getRankTier(rank);
  if (tier == null) return strong ? "border-zinc-500 dark:border-zinc-400" : "border-zinc-400 dark:border-zinc-500";
  return strong ? RANK_TIER_VERT_STRONG[tier] : RANK_TIER_VERT[tier];
}

/** ランクバッジ用（ダッシュボード等の大きなピル）。白文字で単一クラス */
export const RANK_TIER_BADGE: Record<RankTier, string> = {
  D: "bg-blue-600 text-white shadow-md dark:bg-blue-700 dark:text-blue-100",
  C: "bg-sky-500 text-white shadow-md dark:bg-sky-600 dark:text-sky-100",
  B: "bg-violet-500 text-white shadow-md dark:bg-violet-600 dark:text-violet-100",
  A: "bg-pink-500 text-white shadow-md dark:bg-pink-600 dark:text-pink-100",
  S: "bg-red-500 text-white shadow-md dark:bg-red-600 dark:text-red-100",
};

/** ランクバッジ用のクラス文字列を返す（未設定時は未設定用スタイル） */
export function getRankBadgeClass(rank: string | null): string | null {
  const tier = getRankTier(rank);
  if (tier == null) return null;
  return RANK_TIER_BADGE[tier];
}
