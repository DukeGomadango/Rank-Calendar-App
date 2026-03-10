/** 計画で定義されている権限の一覧（role_permissions.permission） */
export const PERMISSION_KEYS = [
  "view_calendar",
  "view_table",
  "view_borders",
  "view_memo",
  "view_target_actual",
  "view_rank",
  "view_events",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_calendar: "カレンダーを表示",
  view_table: "データテーブルを表示",
  view_borders: "ボーダー（+2/+4/+6）を表示",
  view_memo: "メモを表示",
  view_target_actual: "目標+・実績+を表示",
  view_rank: "ランク情報を表示",
  view_events: "参加イベントを表示",
};
