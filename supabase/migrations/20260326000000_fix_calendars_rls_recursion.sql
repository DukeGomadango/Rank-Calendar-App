-- RLS の無限再帰を解消: calendars_select が shares を参照し、shares_select が calendars を参照する循環を断つ。
-- SECURITY DEFINER の関数で「アクセス可能な calendar_id 一覧」を返し、calendars の SELECT ポリシーでそれを使う。
-- 関数内の SELECT は definer（スーパーユーザー）権限で実行されるため RLS がかからず再帰しない。

CREATE OR REPLACE FUNCTION iriam.calendar_ids_accessible_to_user()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = iriam
AS $$
  SELECT id FROM iriam.calendars WHERE owner_id = auth.uid()
  UNION
  SELECT calendar_id FROM iriam.shares WHERE user_id = auth.uid();
$$;

-- 既存の calendars_select を削除して、関数を使うポリシーに差し替え
DROP POLICY IF EXISTS "calendars_select" ON iriam.calendars;

CREATE POLICY "calendars_select"
  ON iriam.calendars FOR SELECT TO authenticated
  USING (id IN (SELECT iriam.calendar_ids_accessible_to_user()));
