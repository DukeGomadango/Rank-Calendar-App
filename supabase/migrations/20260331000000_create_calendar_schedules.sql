-- 時間付きの予定（複数可）を管理するためのテーブル。
-- ランク計算用の日別スコア（schedule_entries）とは分離し、カレンダー表示・共有向けの予定情報のみを保持する。

CREATE TABLE IF NOT EXISTS iriam.calendar_schedules (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  is_all_day boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  kind text,              -- 'personal' | 'stream' などのラベル用途
  visibility text,        -- 'owner_only' | 'shared' など（RLS と組み合わせて利用）
  color_id text,          -- event-colors の id（rose, blue, emerald 等）を再利用
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_schedules_calendar_date
  ON iriam.calendar_schedules (calendar_id, date);

COMMENT ON TABLE iriam.calendar_schedules IS '時間付きの予定（配信・個人予定など）を管理するテーブル。calendar_id + date で日別に複数行を持てる。';
COMMENT ON COLUMN iriam.calendar_schedules.kind IS '予定の種別ラベル（personal / stream など）。閲覧制御そのものは共有タブのロール・権限で行う。';
COMMENT ON COLUMN iriam.calendar_schedules.visibility IS '予定の公開レベル（owner_only / shared など）。RLS と併用して安全側に制御する。';
COMMENT ON COLUMN iriam.calendar_schedules.is_all_day IS '終日予定かどうか。true の場合は時間グリッドではなく終日帯にまとめて表示する。';

-- 権限と RLS 設定

GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.calendar_schedules TO authenticated;

ALTER TABLE iriam.calendar_schedules ENABLE ROW LEVEL SECURITY;

-- 参照: カレンダーがオーナーまたは共有先であれば予定を閲覧可能。
CREATE POLICY "calendar_schedules_select"
  ON iriam.calendar_schedules FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT iriam.calendar_ids_accessible_to_user()
    )
  );

-- 追加: オーナーのみ、自分がオーナーのカレンダーに対して予定を追加可能。
CREATE POLICY "calendar_schedules_insert"
  ON iriam.calendar_schedules FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (
      SELECT id FROM iriam.calendars WHERE owner_id = auth.uid()
    )
  );

-- 更新: オーナーのみ、自分がオーナーのカレンダーに紐づく予定を更新可能。
CREATE POLICY "calendar_schedules_update"
  ON iriam.calendar_schedules FOR UPDATE TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars WHERE owner_id = auth.uid()
    )
  );

-- 削除: オーナーのみ、自分がオーナーのカレンダーに紐づく予定を削除可能。
CREATE POLICY "calendar_schedules_delete"
  ON iriam.calendar_schedules FOR DELETE TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars WHERE owner_id = auth.uid()
    )
  );

