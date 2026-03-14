-- イベントの表示色（カレンダー帯など）と種類（ランキング/達成/背景/その他）
ALTER TABLE iriam.events ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE iriam.events ADD COLUMN IF NOT EXISTS event_type text;

COMMENT ON COLUMN iriam.events.color IS 'カレンダー帯の色。Tailwind色名など（例: rose, blue, emerald）。未設定はデフォルト表示。';
COMMENT ON COLUMN iriam.events.event_type IS '種類: ranking | achievement | background | other';
