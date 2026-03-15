-- スキパ枚数の日別スナップショット（増減・手動変更時に1行追加）。データタブで「その日の枚数」を表示する用。
CREATE TABLE IF NOT EXISTS iriam.skip_pass_snapshots (
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  remaining integer NOT NULL CHECK (remaining >= 0 AND remaining <= 10),
  PRIMARY KEY (calendar_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_skip_pass_snapshots_calendar_as_of
  ON iriam.skip_pass_snapshots (calendar_id, as_of_date DESC);

COMMENT ON TABLE iriam.skip_pass_snapshots IS 'スキパ残り枚数のスナップショット。変更があった日に (as_of_date, remaining) を1行保存。同一日に複数変更は UPSERT で上書き。';
