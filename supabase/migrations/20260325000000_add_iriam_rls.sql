-- iriam スキーマに Row Level Security を追加（多層防御）。
-- 認証済みユーザーのみスキーマにアクセス可。各テーブルはオーナーまたは共有先のみアクセス可。

-- スキーマ利用権限（認証済みユーザーのみ）
GRANT USAGE ON SCHEMA iriam TO authenticated;

-- テーブル権限（RLS で実際のアクセスは制限される）
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.calendars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.schedule_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.invite_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.invite_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.calendar_rank_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.calendar_rank_cycle_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.skip_pass_snapshots TO authenticated;

-- RLS 有効化（既存マイグレーションで作成済みのテーブル）
ALTER TABLE iriam.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.invite_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.calendar_rank_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.calendar_rank_cycle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE iriam.skip_pass_snapshots ENABLE ROW LEVEL SECURITY;

-- calendars: オーナーまたは共有されているカレンダーのみ参照可。作成は自分を owner にした場合のみ。更新・削除はオーナーのみ。
CREATE POLICY "calendars_select"
  ON iriam.calendars FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
  );
CREATE POLICY "calendars_insert"
  ON iriam.calendars FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "calendars_update"
  ON iriam.calendars FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "calendars_delete"
  ON iriam.calendars FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- schedule_entries: 参照はカレンダーがオーナーまたは共有先の場合。編集はオーナーのみ。
CREATE POLICY "schedule_entries_select"
  ON iriam.schedule_entries FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars
      WHERE owner_id = auth.uid() OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "schedule_entries_insert"
  ON iriam.schedule_entries FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "schedule_entries_update"
  ON iriam.schedule_entries FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "schedule_entries_delete"
  ON iriam.schedule_entries FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- events: 同上
CREATE POLICY "events_select"
  ON iriam.events FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars
      WHERE owner_id = auth.uid() OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "events_insert"
  ON iriam.events FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "events_update"
  ON iriam.events FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "events_delete"
  ON iriam.events FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- roles: 参照はオーナーまたは共有先。編集はオーナーのみ。
CREATE POLICY "roles_select"
  ON iriam.roles FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars
      WHERE owner_id = auth.uid() OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "roles_insert"
  ON iriam.roles FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "roles_update"
  ON iriam.roles FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "roles_delete"
  ON iriam.roles FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- role_permissions: ロールが属するカレンダーがオーナーまたは共有先なら参照、編集はオーナーのみ。
CREATE POLICY "role_permissions_select"
  ON iriam.role_permissions FOR SELECT TO authenticated
  USING (
    role_id IN (
      SELECT r.id FROM iriam.roles r
      JOIN iriam.calendars c ON c.id = r.calendar_id
      WHERE c.owner_id = auth.uid() OR c.id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "role_permissions_insert"
  ON iriam.role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    role_id IN (
      SELECT id FROM iriam.roles
      WHERE calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    )
  );
CREATE POLICY "role_permissions_update"
  ON iriam.role_permissions FOR UPDATE TO authenticated
  USING (
    role_id IN (
      SELECT id FROM iriam.roles
      WHERE calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    )
  );
CREATE POLICY "role_permissions_delete"
  ON iriam.role_permissions FOR DELETE TO authenticated
  USING (
    role_id IN (
      SELECT id FROM iriam.roles
      WHERE calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    )
  );

-- shares: オーナーは自カレンダーの共有を操作可。共有先は自分の行のみ参照可。
CREATE POLICY "shares_select"
  ON iriam.shares FOR SELECT TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "shares_insert"
  ON iriam.shares FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "shares_update"
  ON iriam.shares FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "shares_delete"
  ON iriam.shares FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- invite_links: オーナーのみ参照・編集。
CREATE POLICY "invite_links_select"
  ON iriam.invite_links FOR SELECT TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "invite_links_insert"
  ON iriam.invite_links FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    AND created_by = auth.uid()
  );
CREATE POLICY "invite_links_update"
  ON iriam.invite_links FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "invite_links_delete"
  ON iriam.invite_links FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- invite_redemptions: 自分が参加した履歴またはオーナーが自カレンダーの招待履歴を参照。INSERT は自分用のみ（招待 redeem 用）。
CREATE POLICY "invite_redemptions_select"
  ON iriam.invite_redemptions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR invite_link_id IN (
      SELECT id FROM iriam.invite_links
      WHERE calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    )
  );
CREATE POLICY "invite_redemptions_insert"
  ON iriam.invite_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "invite_redemptions_update"
  ON iriam.invite_redemptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "invite_redemptions_delete"
  ON iriam.invite_redemptions FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR invite_link_id IN (
      SELECT id FROM iriam.invite_links
      WHERE calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    )
  );

-- calendar_rank_state: カレンダーがオーナーまたは共有先なら参照、編集はオーナーのみ。
CREATE POLICY "calendar_rank_state_select"
  ON iriam.calendar_rank_state FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars
      WHERE owner_id = auth.uid() OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "calendar_rank_state_insert"
  ON iriam.calendar_rank_state FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "calendar_rank_state_update"
  ON iriam.calendar_rank_state FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "calendar_rank_state_delete"
  ON iriam.calendar_rank_state FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- calendar_rank_cycle_history: 同上
CREATE POLICY "calendar_rank_cycle_history_select"
  ON iriam.calendar_rank_cycle_history FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars
      WHERE owner_id = auth.uid() OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "calendar_rank_cycle_history_insert"
  ON iriam.calendar_rank_cycle_history FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "calendar_rank_cycle_history_update"
  ON iriam.calendar_rank_cycle_history FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "calendar_rank_cycle_history_delete"
  ON iriam.calendar_rank_cycle_history FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );

-- skip_pass_snapshots: 同上
CREATE POLICY "skip_pass_snapshots_select"
  ON iriam.skip_pass_snapshots FOR SELECT TO authenticated
  USING (
    calendar_id IN (
      SELECT id FROM iriam.calendars
      WHERE owner_id = auth.uid() OR id IN (SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "skip_pass_snapshots_insert"
  ON iriam.skip_pass_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "skip_pass_snapshots_update"
  ON iriam.skip_pass_snapshots FOR UPDATE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
CREATE POLICY "skip_pass_snapshots_delete"
  ON iriam.skip_pass_snapshots FOR DELETE TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
  );
