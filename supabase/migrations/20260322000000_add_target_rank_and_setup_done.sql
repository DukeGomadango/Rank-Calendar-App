-- 目標ランク（オンボーディングで入力、UIで「ゴール」表示用）
ALTER TABLE iriam.calendar_rank_state
  ADD COLUMN IF NOT EXISTS target_rank text
  CHECK (target_rank IS NULL OR target_rank IN (
    'D', 'C1', 'C2', 'C3', 'C4', 'C5', 'B1', 'B2', 'B3', 'A1', 'A2', 'A3', 'S1', 'S2', 'S3'
  ));
COMMENT ON COLUMN iriam.calendar_rank_state.target_rank IS '目標ランク（オンボーディングで設定）。S帯を目指す等の表示用。';

-- オーナーがセットアップウィザードを完了したか
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS setup_wizard_done boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.setup_wizard_done IS 'オーナー用セットアップウィザード完了フラグ。true ならダッシュボードでウィザードを出さない。';
