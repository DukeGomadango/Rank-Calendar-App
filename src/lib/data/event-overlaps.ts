export type EventDateRange = {
  start_date: string | null;
  end_date: string | null;
};

/**
 * イベントが「指定日」を含むか。
 * - start_date/end_date の片側 null は “その側の日付のみ” として扱う（既存UIの挙動と一致させる）
 * - start_date/end_date が両方 null の場合は false
 */
export function eventOverlapsDate(
  ev: EventDateRange,
  date: string
): boolean {
  const start = ev.start_date ?? ev.end_date;
  const end = ev.end_date ?? ev.start_date;
  if (start == null || end == null) return false;
  return start <= date && date <= end;
}

/**
 * イベントが「指定期間」を何らかの形で重なるか（from/to は inclusive）。
 */
export function eventOverlapsRange(
  ev: EventDateRange,
  fromDate: string,
  toDate: string
): boolean {
  const start = ev.start_date ?? ev.end_date;
  const end = ev.end_date ?? ev.start_date;
  if (start == null || end == null) return false;
  return start <= toDate && end >= fromDate;
}

