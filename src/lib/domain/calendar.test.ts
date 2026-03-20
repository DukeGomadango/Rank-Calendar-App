import { describe, expect, it } from "vitest";
import {
  addDays,
  compareJstDate,
  getCycleEndDateIncludingSkips,
  getJstWeekStart,
  toJstDateString,
} from "./calendar";

describe("calendar domain (JST)", () => {
  it("converts Date to JST date string", () => {
    const d = new Date("2024-01-02T15:30:00Z"); // JST では 2024-01-03
    const jst = toJstDateString(d);
    expect(jst).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns Monday as week start for mid-week dates", () => {
    expect(getJstWeekStart("2024-01-01")).toBe("2024-01-01"); // Mon
    expect(getJstWeekStart("2024-01-03")).toBe("2024-01-01"); // Wed -> same week
  });

  it("treats Sunday as end of ISO week", () => {
    expect(getJstWeekStart("2024-01-07")).toBe("2024-01-01"); // Sun
    expect(getJstWeekStart("2024-01-08")).toBe("2024-01-08"); // next Mon
  });

  it("compares JST dates lexicographically", () => {
    expect(compareJstDate("2024-01-01", "2024-01-01")).toBe(0);
    expect(compareJstDate("2024-01-01", "2024-01-02")).toBeLessThan(0);
    expect(compareJstDate("2024-02-01", "2024-01-31")).toBeGreaterThan(0);
  });

  it("addDays adds n days to date string", () => {
    expect(addDays("2024-01-01", 0)).toBe("2024-01-01");
    expect(addDays("2024-01-01", 1)).toBe("2024-01-02");
    expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
    expect(addDays("2024-01-15", 6)).toBe("2024-01-21");
  });

  describe("getCycleEndDateIncludingSkips", () => {
    it("returns start+6 when no skips in the 7-day window", () => {
      const entriesByDate = new Map<string, { skip_pass_used?: boolean }>();
      expect(getCycleEndDateIncludingSkips("2024-01-22", entriesByDate)).toBe(
        "2024-01-28"
      );
    });

    it("returns start+7 when one skip in the 7-day window", () => {
      const entriesByDate = new Map<string, { skip_pass_used?: boolean }>([
        ["2024-01-23", { skip_pass_used: true }],
      ]);
      expect(getCycleEndDateIncludingSkips("2024-01-22", entriesByDate)).toBe(
        "2024-01-29"
      );
    });

    it("returns start+8 when two skips in the 7-day window", () => {
      const entriesByDate = new Map<string, { skip_pass_used?: boolean }>([
        ["2024-01-23", { skip_pass_used: true }],
        ["2024-01-25", { skip_pass_used: true }],
      ]);
      expect(getCycleEndDateIncludingSkips("2024-01-22", entriesByDate)).toBe(
        "2024-01-30"
      );
    });

    it("ignores isolated skip outside the 7-day window", () => {
      const entriesByDate = new Map<string, { skip_pass_used?: boolean }>([
        ["2024-01-29", { skip_pass_used: true }], // 22+6=28 より後
      ]);
      expect(getCycleEndDateIncludingSkips("2024-01-22", entriesByDate)).toBe(
        "2024-01-28"
      );
    });

    it("extends again when skip exists on extended day", () => {
      const entriesByDate = new Map<string, { skip_pass_used?: boolean }>([
        ["2024-01-23", { skip_pass_used: true }], // まず +1 で 29 まで
        ["2024-01-29", { skip_pass_used: true }], // 延長で追加された日も skip なのでさらに +1
      ]);
      expect(getCycleEndDateIncludingSkips("2024-01-22", entriesByDate)).toBe(
        "2024-01-30"
      );
    });
  });
});

