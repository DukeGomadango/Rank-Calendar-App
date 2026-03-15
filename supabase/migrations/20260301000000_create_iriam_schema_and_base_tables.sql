-- IRIAM スキーマと基盤テーブル（既存マイグレーションの前提）
-- 実行: supabase db push で他のマイグレーションとまとめて適用可能。

CREATE SCHEMA IF NOT EXISTS iriam;

-- カレンダー（オーナー＝ライバー）
CREATE TABLE IF NOT EXISTS iriam.calendars (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendars_owner_id ON iriam.calendars (owner_id);

-- イベント（カレンダーに紐づく）
CREATE TABLE IF NOT EXISTS iriam.events (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON iriam.events (calendar_id);

-- 日別スケジュール（カレンダー + 日付で一意）
CREATE TABLE IF NOT EXISTS iriam.schedule_entries (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  date date NOT NULL,
  target_plus smallint,
  actual_plus smallint,
  skip_pass_used boolean NOT NULL DEFAULT false,
  border_plus2 smallint,
  border_plus4 smallint,
  border_plus6 smallint,
  event_id uuid REFERENCES iriam.events(id) ON DELETE SET NULL,
  memo text,
  CONSTRAINT schedule_entries_calendar_date_unique UNIQUE (calendar_id, date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_calendar_date ON iriam.schedule_entries (calendar_id, date);

-- 共有用ロール
CREATE TABLE IF NOT EXISTS iriam.roles (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_calendar_id ON iriam.roles (calendar_id);

-- ロールと権限の対応
CREATE TABLE IF NOT EXISTS iriam.role_permissions (
  role_id uuid NOT NULL REFERENCES iriam.roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  PRIMARY KEY (role_id, permission)
);

-- 招待リンク（role_id は 20260317 のマイグレーションで追加）
CREATE TABLE IF NOT EXISTS iriam.invite_links (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_links_calendar_token ON iriam.invite_links (calendar_id, token);

-- 招待利用履歴
CREATE TABLE IF NOT EXISTS iriam.invite_redemptions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_link_id uuid NOT NULL REFERENCES iriam.invite_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_redemptions_link_user_unique UNIQUE (invite_link_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_redemptions_invite_link_id ON iriam.invite_redemptions (invite_link_id);

-- 共有（ユーザーとカレンダーの紐づけ）
CREATE TABLE IF NOT EXISTS iriam.shares (
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES iriam.roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_user_id ON iriam.shares (user_id);

COMMENT ON SCHEMA iriam IS 'IRIAM rank planner アプリ用スキーマ。';
COMMENT ON TABLE iriam.calendars IS 'カレンダー本体。owner_id でライバーに紐づく。';
COMMENT ON TABLE iriam.schedule_entries IS '日付・カレンダーごとのスケジュール。calendar_id + date で一意。';
COMMENT ON TABLE iriam.events IS 'カレンダーに紐づくイベント。';
COMMENT ON TABLE iriam.roles IS '共有用ロール定義。';
COMMENT ON TABLE iriam.role_permissions IS 'ロールと権限（view_calendar 等）の対応。';
COMMENT ON TABLE iriam.invite_links IS '招待リンク。token で redeem。';
COMMENT ON TABLE iriam.invite_redemptions IS '招待の利用履歴。';
COMMENT ON TABLE iriam.shares IS 'ユーザーとカレンダーの共有関係。';
