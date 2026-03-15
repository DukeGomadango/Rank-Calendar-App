-- 配信内容（歌枠・雑談・パネルあけ等の自由記述）と左線の色。カレンダー上でのみ表示・編集。
ALTER TABLE iriam.schedule_entries
  ADD COLUMN IF NOT EXISTS stream_content text,
  ADD COLUMN IF NOT EXISTS stream_content_color text;

COMMENT ON COLUMN iriam.schedule_entries.stream_content IS '配信内容の自由記述（歌枠・雑談・パネルあけ等）。カレンダーで左線色付き表示。';
COMMENT ON COLUMN iriam.schedule_entries.stream_content_color IS '配信内容の左線色。event-colors の id（rose, blue, emerald 等）。';
