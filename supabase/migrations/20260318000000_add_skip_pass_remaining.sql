-- スキパ残り枚数管理: 前週に actual_plus >= 1 の日が1日でもあれば月曜に+1、上限10。使用時に-1。
ALTER TABLE iriam.calendar_rank_state
  ADD COLUMN IF NOT EXISTS skip_pass_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skip_pass_last_increment_week_start date;

COMMENT ON COLUMN iriam.calendar_rank_state.skip_pass_remaining IS 'スキパ残り枚数。0〜10。月曜の自動+1・使用時に-1・手動編集で更新。';
COMMENT ON COLUMN iriam.calendar_rank_state.skip_pass_last_increment_week_start IS '最後に+1した週の月曜日。二重加算防止用。';
