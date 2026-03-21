/**
 * データタブの1行と日詳細モーダルで共有する、1日分の表示・編集用スナップショット型。
 */
export type ScheduleDayRow = {
  date: string;
  weekday: string;
  id?: string;
  ansuko_baseline?: number | null;
  border_plus2?: number | null;
  border_plus4?: number | null;
  border_plus6?: number | null;
  target_plus?: number | null;
  actual_plus?: number | null;
  skip_pass_used?: boolean;
  current_rank?: string | null;
  /** データ表での周期境界表示用（モーダルでは未使用） */
  rank_cycle_boundary?: "start" | "end" | null;
  rank_score_cumulative?: number | null;
  skip_pass_remaining_as_of?: number | null;
  memo?: string | null;
  event_id?: string | null;
  stream_content?: string | null;
  stream_content_color?: string | null;
};
