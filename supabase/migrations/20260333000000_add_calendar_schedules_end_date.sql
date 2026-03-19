-- calendar_schedules の日付跨ぎ（終了日）を表現するための列追加。
-- 既存データは end_date = NULL として扱い、アプリ側で「end_date未設定 => date(=同日)」に丸める。

ALTER TABLE iriam.calendar_schedules
  ADD COLUMN IF NOT EXISTS end_date date;

-- end_date が設定されている場合のみ整合性を担保
-- 注: PostgreSQL では ADD CONSTRAINT IF NOT EXISTS は使えないため DO ブロックで冪等に追加する
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'calendar_schedules_end_date_gte_date'
      AND n.nspname = 'iriam'
      AND t.relname = 'calendar_schedules'
  ) THEN
    ALTER TABLE iriam.calendar_schedules
      ADD CONSTRAINT calendar_schedules_end_date_gte_date
      CHECK (end_date IS NULL OR end_date >= date);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_calendar_schedules_calendar_date_end_date
  ON iriam.calendar_schedules (calendar_id, date, end_date);
