import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { CalendarScheduleRow } from "@/lib/data/schedules";

/**
 * カレンダー権限に基づき、スケジュール行を閲覧できるか。
 * 週グリッド・日モーダルで同一判定にする。
 */
export function canViewScheduleKind(
  permissions: CalendarPermissionFlags,
  kind: CalendarScheduleRow["kind"] | null | undefined
): boolean {
  if (permissions.isOwner) return true;
  switch (kind) {
    case "stream":
      return permissions.canViewScheduleStream;
    case "personal":
      return permissions.canViewSchedulePersonal;
    case "secret":
      return permissions.canViewScheduleSecret;
    default:
      return (
        permissions.canViewScheduleStream || permissions.canViewSchedulePersonal
      );
  }
}
