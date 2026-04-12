import { describe, expect, it } from "vitest";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { canViewScheduleKind } from "./schedule-visibility";

const listenerStreamOnly: CalendarPermissionFlags = {
  isOwner: false,
  canEditSchedule: false,
  canViewCalendar: true,
  canViewTable: true,
  canViewBorders: false,
  canViewMemo: false,
  canViewTargetActual: true,
  canViewRank: true,
  canViewEvents: true,
  canViewScheduleStream: true,
  canViewSchedulePersonal: false,
  canViewScheduleSecret: false,
};

describe("canViewScheduleKind", () => {
  it("オーナーは種別に関わらず true", () => {
    const owner: CalendarPermissionFlags = {
      ...listenerStreamOnly,
      isOwner: true,
      canEditSchedule: true,
      canViewBorders: true,
      canViewMemo: true,
      canViewSchedulePersonal: true,
      canViewScheduleSecret: true,
    };
    expect(canViewScheduleKind(owner, "stream")).toBe(true);
    expect(canViewScheduleKind(owner, "secret")).toBe(true);
    expect(canViewScheduleKind(owner, null)).toBe(true);
  });

  it("stream は view_schedule_stream に従う", () => {
    expect(canViewScheduleKind(listenerStreamOnly, "stream")).toBe(true);
    expect(
      canViewScheduleKind({ ...listenerStreamOnly, canViewScheduleStream: false }, "stream"),
    ).toBe(false);
  });

  it("kind 未設定は stream または personal のいずれかで true", () => {
    expect(canViewScheduleKind(listenerStreamOnly, null)).toBe(true);
    expect(
      canViewScheduleKind(
        { ...listenerStreamOnly, canViewScheduleStream: false, canViewSchedulePersonal: false },
        null,
      ),
    ).toBe(false);
  });
});
