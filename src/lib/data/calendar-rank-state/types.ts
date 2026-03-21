import type { RankLabel } from "@/lib/domain/rank";

export type CalendarRankStateRow = {
  calendar_id: string;
  current_rank: RankLabel | null;
  target_rank: RankLabel | null;
  rank_cycle_start_date: string;
  rank_reset_date: string;
  skip_pass_remaining: number;
  skip_pass_last_increment_week_start: string | null;
};

export type SkipPassSnapshotRow = { as_of_date: string; remaining: number };

export type RankCycleHistoryRow = {
  id: string;
  calendar_id: string;
  cycle_start_date: string;
  cycle_end_date: string;
  rank_during: RankLabel | null;
};
