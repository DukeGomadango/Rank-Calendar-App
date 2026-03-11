import type { JstDateString } from "./calendar";
import { compareJstDate, getJstWeekStart } from "./calendar";

export type RankEntry = {
  date: JstDateString;
  actual_plus: number | null;
  skip_pass_used: boolean;
};

export type WeeklyRankProgress = {
  weekStart: JstDateString;
  totalPlus: number;
  /**
   * 週内の各日付ごとの累積値
   */
  byDate: Record<JstDateString, number>;
};

export type RankJudgement = {
  /**
   * 判定対象週の開始日（JST）
   */
  weekStart: JstDateString;
  /**
   * 週内の + 合計（スキップ日は除外、+0 の配信休みは含む）
   */
  totalPlus: number;
  /**
   * 翌日0:00 時点で +18 到達によるランクアップ条件を満たしているか
   */
  canRankUpNextDay: boolean;
  /**
   * +18 には届かないが、+12 に到達しているか（途中経過の目安）
   */
  reachedIntermediate: boolean;
};

/**
 * 実績+とスキップフラグから、週ごとの累積+を計算する。
 *
 * - 週は JST の月曜始まり（getJstWeekStart）で区切る
 * - skip_pass_used=true の日は集計から除外する
 * - actual_plus が null または undefined の日は 0 扱い
 * - 「配信休み」は actual_plus=0, skip_pass_used=false の日としてカウントする
 */
export function calculateWeeklyRankProgress(
  entries: RankEntry[]
): WeeklyRankProgress[] {
  // 日付順に並べ替え
  const sorted = [...entries].sort((a, b) => compareJstDate(a.date, b.date));

  const byWeek = new Map<JstDateString, WeeklyRankProgress>();

  for (const entry of sorted) {
    const weekStart = getJstWeekStart(entry.date);
    const plus =
      entry.skip_pass_used || entry.actual_plus == null
        ? 0
        : Math.max(0, entry.actual_plus);

    let progress = byWeek.get(weekStart);
    if (!progress) {
      progress = {
        weekStart,
        totalPlus: 0,
        byDate: {},
      };
      byWeek.set(weekStart, progress);
    }

    // スキップ日は「実働7日」からも除外したいので、単純に0として足すだけにする
    if (!entry.skip_pass_used) {
      progress.totalPlus += plus;
    }

    const prevForDate = progress.byDate[entry.date] ?? 0;
    progress.byDate[entry.date] = prevForDate + plus;
  }

  return Array.from(byWeek.values()).sort((a, b) =>
    compareJstDate(a.weekStart, b.weekStart)
  );
}

/**
 * 週ごとのランク判定を行う。
 *
 * - +18 到達で「翌日0:00にランクアップ可」とみなす
 * - +12 到達で「中間目標達成」とみなす
 */
export function judgeWeeklyRank(entries: RankEntry[]): RankJudgement[] {
  const weekly = calculateWeeklyRankProgress(entries);

  return weekly.map((w) => ({
    weekStart: w.weekStart,
    totalPlus: w.totalPlus,
    canRankUpNextDay: w.totalPlus >= 18,
    reachedIntermediate: w.totalPlus >= 12,
  }));
}

