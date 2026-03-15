-- プロフィール: アバター画像URL（Storage 公開URL）とオンボーディングの現在ステップ
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS onboarding_step smallint NOT NULL DEFAULT 1
    CHECK (onboarding_step >= 1 AND onboarding_step <= 5);
COMMENT ON COLUMN public.profiles.avatar_url IS 'アバター画像の公開URL（Supabase Storage avatars バケット）。未設定なら表示名から自動生成。';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'オンボーディングの現在ステップ 1〜5。タブ切り替え後も途中から再開する用。';

-- アバター用 Storage バケット（公開読み取り）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 認証ユーザーは自分のフォルダ {user_id} にのみアップロード・上書き・削除可能
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証済みユーザーはアバター画像を読み取り可能（共有ページ等で他ユーザーのアイコン表示用）
CREATE POLICY "Authenticated can read avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
