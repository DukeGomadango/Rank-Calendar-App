import { addDays, compareJstDate, getCycleEndDateIncludingSkips, type JstDateString } from "./calendar";
import {
  calculateCycleCumulativeByDate,
  getNextRank,
  getPreviousRank,
  judgeCycleRank,
  projectedPlusForRankForecast,
  type EntryForRankForecast,
  type RankEntry,
  type RankLabel,
} from "./rank";
import {
  getUsablePredictedSkipPassDates,
  type EntryForPrediction,
} from "./skip-pass-prediction";

export type RankCycleHistoryInput = {
  cycle_start_date: string;
  cycle_end_date: string;
  rank_during: string | null;
  cycle_total?: number | null;
};

export type SimulatedRankCycle = {
  start: JstDateString;
  end: JstDateString;
  rank: RankLabel | string;
  /** 周期開始日が今日より後（未来周期のみ） */
  isPredicted: boolean;
  cycleTotal?: number | null;
};

export type SimulateRankCyclesInput = {
  cycleStart: JstDateString;
  initialRank: RankLabel | string | null;
  entriesByDate: Map<string, EntryForRankForecast>;
  getEntryForForecast: (date: JstDateString) => EntryForRankForecast | undefined;
  todayJst: JstDateString;
  simulateToDate: JstDateString;
  maxCycles?: number;
};

/**
 * 周期開始日から simulateToDate まで、IRIAM 仕様（途中 +18 で翌日から新周期）に沿ってランク周期をシミュレートする。
 */
export function simulateRankCyclesForward(
  input: SimulateRankCyclesInput,
): SimulatedRankCycle[] {
  const {
    cycleStart,
    initialRank,
    entriesByDate,
    getEntryForForecast,
    todayJst,
    simulateToDate,
    maxCycles = 52,
  } = input;

  if (initialRank == null) return [];

  const cycles: SimulatedRankCycle[] = [];
  let periodStart: JstDateString = cycleStart;
  let rankForPeriod: RankLabel | string = initialRank;
  let iterations = 0;

  while (
    compareJstDate(periodStart, simulateToDate) <= 0 &&
    rankForPeriod != null &&
    iterations < maxCycles
  ) {
    iterations += 1;
    const maxEnd = getCycleEndDateIncludingSkips(periodStart, entriesByDate);
    let cumulative = 0;
    let periodEnd: JstDateString | null = null;
    let c: JstDateString = periodStart;

    while (compareJstDate(c, maxEnd) <= 0) {
      const plus = projectedPlusForRankForecast(
        getEntryForForecast(c),
        c,
        todayJst,
      );
      cumulative += plus;
      if (cumulative >= 18) {
        periodEnd = c;
        break;
      }
      if (c === maxEnd) {
        periodEnd = c;
        break;
      }
      c = addDays(c, 1);
    }

    if (periodEnd == null) {
      periodEnd = maxEnd;
    }

    cycles.push({
      start: periodStart,
      end: periodEnd,
      rank: rankForPeriod,
      isPredicted: compareJstDate(periodStart, todayJst) > 0,
    });

    if (cumulative >= 18) {
      const next = getNextRank(rankForPeriod as RankLabel);
      rankForPeriod = next ?? (rankForPeriod as RankLabel);
    } else {
      const { canRankUp, isKeep } = judgeCycleRank(cumulative);
      if (canRankUp) {
        rankForPeriod =
          getNextRank(rankForPeriod as RankLabel) ?? (rankForPeriod as RankLabel);
      } else if (!isKeep) {
        rankForPeriod =
          (getPreviousRank(rankForPeriod as RankLabel) as RankLabel | null) ??
          rankForPeriod;
      }
    }

    periodStart = addDays(periodEnd, 1);
  }

  return cycles;
}

export function createGetEntryForForecast(
  entriesByDate: Map<string, EntryForPrediction>,
  todayJst: JstDateString,
  skipPassRemaining: number,
  skipPredictionEnd: JstDateString,
): (date: JstDateString) => EntryForRankForecast | undefined {
  const usableFutureSkipDates = getUsablePredictedSkipPassDates(
    skipPassRemaining,
    todayJst,
    skipPredictionEnd,
    entriesByDate,
    todayJst,
  );

  return (date: JstDateString): EntryForRankForecast | undefined => {
    const entry = entriesByDate.get(date);
    if (!entry) return undefined;
    if (date >= todayJst && entry.skip_pass_used && !usableFutureSkipDates.has(date)) {
      return { ...entry, skip_pass_used: false };
    }
    return entry;
  };
}

export type BuildDisplayRankCyclesInput = {
  history: RankCycleHistoryInput[];
  rankState: {
    rank_cycle_start_date: string;
    rank_reset_date: string;
    current_rank: string | null;
    skip_pass_remaining?: number | null;
  };
  entriesByDate: Map<string, EntryForRankForecast>;
  todayJst: JstDateString;
  simulateToDate: JstDateString;
};

export type BuildDisplayRankCyclesResult = {
  displayCycles: SimulatedRankCycle[];
  forecastLabel: string | null;
};

/**
 * DB 履歴 + 現在周期起点からのシミュレーションを合成し、カレンダー表示用の周期一覧を返す。
 */
export function buildDisplayRankCycles(
  input: BuildDisplayRankCyclesInput,
): BuildDisplayRankCyclesResult {
  const { history, rankState, entriesByDate, todayJst, simulateToDate } = input;

  const skipPredictionEnd = addDays(rankState.rank_reset_date, 120);
  const getEntryForForecast = createGetEntryForForecast(
    entriesByDate as Map<string, EntryForPrediction>,
    todayJst,
    rankState.skip_pass_remaining ?? 0,
    skipPredictionEnd,
  );

  const historyCycles: SimulatedRankCycle[] = history.map((h) => ({
    start: h.cycle_start_date,
    end: h.cycle_end_date,
    rank: h.rank_during ?? "—",
    isPredicted: false,
    cycleTotal: h.cycle_total ?? null,
  }));

  const forward =
    rankState.current_rank != null
      ? simulateRankCyclesForward({
          cycleStart: rankState.rank_cycle_start_date,
          initialRank: rankState.current_rank,
          entriesByDate,
          getEntryForForecast,
          todayJst,
          simulateToDate,
        })
      : [];

  const displayCycles = [...historyCycles, ...forward];

  let forecastLabel: string | null = null;
  if (rankState.current_rank != null && forward.length > 0) {
    const first = forward[0];
    const rankAfterFirst =
      forward.length > 1
        ? forward[1].rank
        : (() => {
            let total = 0;
            let d = first.start;
            while (compareJstDate(d, first.end) <= 0) {
              total += projectedPlusForRankForecast(
                getEntryForForecast(d),
                d,
                todayJst,
              );
              d = addDays(d, 1);
            }
            const { canRankUp, isKeep } = judgeCycleRank(total);
            if (canRankUp) {
              return (
                getNextRank(rankState.current_rank as RankLabel) ??
                rankState.current_rank
              );
            }
            if (isKeep) return rankState.current_rank;
            return (
              getPreviousRank(rankState.current_rank as RankLabel) ??
              rankState.current_rank
            );
          })();
    if (rankAfterFirst !== rankState.current_rank) {
      forecastLabel = `${rankState.current_rank} → ${rankAfterFirst}`;
    }
  }

  return { displayCycles, forecastLabel };
}

/** 周期内で累計 + が 18 に達した最初の日（ランクアップ反映用）。 */
export function findRankUpAchievedDateInCycle(
  entries: RankEntry[],
  cycleStart: JstDateString,
  cycleEnd: JstDateString,
): JstDateString | null {
  const byDate = calculateCycleCumulativeByDate(entries, cycleStart, cycleEnd);
  const sortedDates = Object.keys(byDate).sort(compareJstDate);
  for (const d of sortedDates) {
    if ((byDate[d] ?? 0) >= 18) return d;
  }
  return null;
}
