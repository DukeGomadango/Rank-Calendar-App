-- shares_select の USING 内で iriam.shares を再度 SELECT すると、
-- 行ごとのポリシー評価が再帰し「infinite recursion detected in policy for relation shares」になる。
-- オーナー or 自分の行のみ、の定義に戻す（calendars 側は calendar_ids_accessible_to_user() で既に共有を表現）。

DROP POLICY IF EXISTS "shares_select" ON iriam.shares;

CREATE POLICY "shares_select"
  ON iriam.shares FOR SELECT TO authenticated
  USING (
    calendar_id IN (SELECT id FROM iriam.calendars WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );
