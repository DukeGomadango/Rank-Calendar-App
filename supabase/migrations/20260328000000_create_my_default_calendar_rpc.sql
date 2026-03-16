-- 認証済みユーザーが「マイカレンダー」を1件取得または作成する。
-- SECURITY DEFINER で RLS をバイパスするが、owner_id は必ず auth.uid() に固定する。
-- アプリからは認証済みクライアントで呼ぶため、サービスロールを使わずに作成できる。

CREATE OR REPLACE FUNCTION iriam.create_my_default_calendar()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name::text
  FROM iriam.calendars c
  WHERE c.owner_id = auth.uid()
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    INSERT INTO iriam.calendars (owner_id, name)
    VALUES (auth.uid(), 'メインカレンダー')
    RETURNING iriam.calendars.id, iriam.calendars.name::text;
  END IF;
END;
$$;

COMMENT ON FUNCTION iriam.create_my_default_calendar() IS
  '呼び出し元（auth.uid()）のデフォルトカレンダーを1件返す。無ければ作成して返す。認証済みクライアントからのみ呼ぶこと。';

GRANT EXECUTE ON FUNCTION iriam.create_my_default_calendar() TO authenticated;
