-- オンボーディングは6ステップ（直近イベント含む）のため、onboarding_step の CHECK を 1〜6 に拡張。
-- 従来の 1〜5 のままだとステップ5（ランクリセット日）完了時に 6 を保存できず「しばらくして再度お試しください。」で止まる不具合を解消する。

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_step_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_step_check CHECK (onboarding_step >= 1 AND onboarding_step <= 6);

COMMENT ON COLUMN public.profiles.onboarding_step IS 'オンボーディングの現在ステップ 1〜6。タブ切り替え後も途中から再開する用。';
