-- あんしんランクスコア（アンスコ）の基準値。この応援ポイントを超えると+2確定。週次変動するため日別で記録。
ALTER TABLE iriam.schedule_entries
  ADD COLUMN IF NOT EXISTS ansuko_baseline integer CHECK (ansuko_baseline IS NULL OR ansuko_baseline >= 0);

COMMENT ON COLUMN iriam.schedule_entries.ansuko_baseline IS 'あんしんランクスコア（アンスコ）の基準値（応援ポイント）。この値を超えるとその日の+2が確定。+2ボーダーの左で表示・編集。';
