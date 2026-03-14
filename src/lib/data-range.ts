/** データタブで選べる表示日数（今日の前後何日分か） */
export const DATA_RANGE_OPTIONS = [
  { value: 7, label: "7日分（前後7日）" },
  { value: 14, label: "14日分（前後14日）" },
  { value: 30, label: "30日分（前後30日）" },
  { value: 60, label: "60日分（前後60日）" },
  { value: 90, label: "90日分（前後90日）" },
] as const;

const VALID_DAYS = new Set(DATA_RANGE_OPTIONS.map((o) => o.value));

export const DEFAULT_DATA_RANGE_DAYS = 30;

export function parseDaysParam(value: string | null | undefined): number {
  if (value == null) return DEFAULT_DATA_RANGE_DAYS;
  const n = Number(value);
  return VALID_DAYS.has(n) ? n : DEFAULT_DATA_RANGE_DAYS;
}
