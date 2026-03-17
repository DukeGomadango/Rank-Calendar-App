-- ボーダー列の型拡張: smallint -> integer
-- 9,999万クラスのボーダー値を扱うため、schedule_entries の border_plus2/4/6 を integer に拡張する。

ALTER TABLE iriam.schedule_entries
  ALTER COLUMN border_plus2 TYPE integer USING border_plus2::integer,
  ALTER COLUMN border_plus4 TYPE integer USING border_plus4::integer,
  ALTER COLUMN border_plus6 TYPE integer USING border_plus6::integer;

