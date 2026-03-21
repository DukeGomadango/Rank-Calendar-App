import type { PermissionKey } from "@/lib/data/permissions";

/** 権限のグループ（基本情報 / センシティブ情報） */
export const PERM_GROUP_BASIC: PermissionKey[] = [
  "view_calendar",
  "view_table",
  "view_target_actual",
  "view_rank",
  "view_events",
  "view_schedule_stream",
];

export const PERM_GROUP_SENSITIVE: PermissionKey[] = [
  "view_borders",
  "view_memo",
  "view_schedule_personal",
  "view_schedule_secret",
];
