import { describe, expect, it } from "vitest";

import { shouldShowSharingTab } from "./DashboardNavLinks";

describe("shouldShowSharingTab", () => {
  it("calendarId 未指定なら isOwner を使う", () => {
    expect(shouldShowSharingTab(true, [], null)).toBe(true);
    expect(shouldShowSharingTab(false, [], null)).toBe(false);
  });

  it("calendarId が所有一覧に含まれるなら表示する", () => {
    expect(shouldShowSharingTab(false, ["cal-1"], "cal-1")).toBe(true);
  });

  it("calendarId が不正でもオーナーは表示する", () => {
    expect(shouldShowSharingTab(true, ["cal-1"], "unknown")).toBe(true);
  });

  it("calendarId が不正かつ非オーナーは非表示のまま", () => {
    expect(shouldShowSharingTab(false, ["cal-1"], "unknown")).toBe(false);
  });
});
