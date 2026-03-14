-- IRIAM per-liver rank cycle: calendar_rank_state テーブル（案B）
-- カレンダーごとの「現在ランク」と「現在の集計周期」を保持する。
-- 実行: Supabase Dashboard の SQL Editor で実行するか、supabase db push で適用。

CREATE TABLE IF NOT EXISTS iriam.calendar_rank_state (
  calendar_id uuid NOT NULL PRIMARY KEY REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  current_rank text CHECK (current_rank IS NULL OR current_rank IN (
    'D', 'C1', 'C2', 'C3', 'C4', 'C5', 'B1', 'B2', 'B3', 'A1', 'A2', 'A3', 'S1', 'S2', 'S3'
  )),
  rank_cycle_start_date date NOT NULL,
  rank_reset_date date NOT NULL,
  CONSTRAINT rank_reset_after_start CHECK (rank_reset_date >= rank_cycle_start_date)
);

COMMENT ON TABLE iriam.calendar_rank_state IS 'カレンダー単位のランク状態（現在ランク・集計周期）。スキップでリセット日延長、ランクアップで新周期。';
COMMENT ON COLUMN iriam.calendar_rank_state.current_rank IS 'IRIAM 15段階。未設定は null。';
COMMENT ON COLUMN iriam.calendar_rank_state.rank_cycle_start_date IS '現在の集計周期の開始日（JST YYYY-MM-DD）。';
COMMENT ON COLUMN iriam.calendar_rank_state.rank_reset_date IS '現在の集計周期の終了＝リセット日。スキップ使用で延長される。';
