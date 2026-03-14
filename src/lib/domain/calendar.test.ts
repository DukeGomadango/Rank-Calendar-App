import { describe, expect, it } from "vitest";
import { addDays, compareJstDate, getJstWeekStart, toJstDateString } from "./calendar";

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
});

