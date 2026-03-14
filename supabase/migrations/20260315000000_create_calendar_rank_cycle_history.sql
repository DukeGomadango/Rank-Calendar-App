-- ランク周期履歴（カレンダーで「今日より前」のランク帯表示用）
-- ランクアップを反映したときに、終了した周期をここに insert する。

CREATE TABLE IF NOT EXISTS iriam.calendar_rank_cycle_history (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  cycle_start_date date NOT NULL,
  cycle_end_date date NOT NULL,
  rank_during text CHECK (rank_during IS NULL OR rank_during IN (
    'D', 'C1', 'C2', 'C3', 'C4', 'C5', 'B1', 'B2', 'B3', 'A1', 'A2', 'A3', 'S1', 'S2', 'S3'
  )),
  CONSTRAINT cycle_end_after_start CHECK (cycle_end_date >= cycle_start_date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_rank_cycle_history_calendar_dates
  ON iriam.calendar_rank_cycle_history (calendar_id, cycle_start_date, cycle_end_date);

COMMENT ON TABLE iriam.calendar_rank_cycle_history IS '終了したランク周期の履歴。ランクアップ反映時に insert。カレンダーで過去のランク帯表示に使用。';
COMMENT ON COLUMN iriam.calendar_rank_cycle_history.rank_during IS 'その周期で付いていたランク（IRIAM 15段階）。';
