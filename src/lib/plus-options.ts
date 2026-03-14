/** 目標+・実績+の選択肢。+0 がデフォルト。 */
export const PLUS_SELECT_VALUES = [0, 1, 2, 4, 6] as const;
export type PlusSelectValue = (typeof PLUS_SELECT_VALUES)[number];

export function normalizePlusValue(v: number | null | undefined): number {
  if (v == null) return 0;
  return PLUS_SELECT_VALUES.includes(v as PlusSelectValue) ? (v as PlusSelectValue) : 0;
}
