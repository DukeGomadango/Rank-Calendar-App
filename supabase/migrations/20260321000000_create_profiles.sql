-- 表示名などユーザーごとの公開プロフィール。メールは auth にのみ保持し、アプリ内では表示しない。
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 共有・招待一覧で他ユーザーの表示名のみ表示（メールは出さない）。認証済みなら全プロフィールを読める。
CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 招待で参加したユーザーの表示名をオーナーが一覧するため、サービスロールで読む想定。
-- 共有ページでは invite_redemptions + profiles を join して display_name のみ表示（メールは出さない）。
COMMENT ON TABLE public.profiles IS 'ユーザー表示名。他ユーザーにはメールを見せず display_name のみ表示する。';
