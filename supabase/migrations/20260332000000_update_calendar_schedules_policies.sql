-- calendar_schedules の RLS を kind ごとの閲覧権限に対応させる
-- view_schedule_stream / view_schedule_personal / view_schedule_secret を用いる。

-- 既存ポリシーがある場合はいったん削除して作り直す（id 名は前提に依存しないよう名称で削除）。
DROP POLICY IF EXISTS "calendar_schedules_select" ON iriam.calendar_schedules;

-- SELECT: オーナー、または shares 経由で権限を持つユーザーのみ。
-- - kind = 'stream'   の行:   view_schedule_stream を持つロール
-- - kind = 'personal' の行:   view_schedule_personal を持つロール
-- - kind = 'secret'   の行:   view_schedule_secret を持つロール
-- - kind が NULL など上記以外: view_schedule_stream または view_schedule_personal のどちらか
CREATE POLICY "calendar_schedules_select"
  ON iriam.calendar_schedules
  FOR SELECT
  TO authenticated
  USING (
    -- オーナーは常に閲覧可能
    iriam.calendar_schedules.calendar_id IN (
      SELECT id FROM iriam.calendars WHERE owner_id = auth.uid()
    )
    OR
    -- 共有ユーザーはロールに紐づく権限に応じて kind ごとに閲覧可否を決定
    EXISTS (
      SELECT 1
      FROM iriam.shares sh
      JOIN iriam.roles r ON r.id = sh.role_id
      JOIN iriam.role_permissions rp ON rp.role_id = r.id
      WHERE
        sh.calendar_id = iriam.calendar_schedules.calendar_id
        AND sh.user_id = auth.uid()
        AND (
          (iriam.calendar_schedules.kind = 'stream'   AND rp.permission = 'view_schedule_stream')
          OR (iriam.calendar_schedules.kind = 'personal' AND rp.permission = 'view_schedule_personal')
          OR (iriam.calendar_schedules.kind = 'secret'   AND rp.permission = 'view_schedule_secret')
          OR (iriam.calendar_schedules.kind IS NULL AND rp.permission IN ('view_schedule_stream', 'view_schedule_personal'))
        )
    )
  );

