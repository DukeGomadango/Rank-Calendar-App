import { describe, expect, it } from "vitest";

import {
  assignWeekColumnLayout,
  MINUTES_PER_DAY,
  segmentsOverlap,
  snapMinutesToSlot,
  type WeekViewSegment,
  WEEK_VIEW_SLOT_MINUTES,
} from "./week-view-layout";

describe("snapMinutesToSlot", () => {
  it("rounds to nearest 15 minutes", () => {
    expect(snapMinutesToSlot(7, 15)).toBe(0);
    expect(snapMinutesToSlot(8, 15)).toBe(15);
    expect(snapMinutesToSlot(22, 15)).toBe(15);
    expect(snapMinutesToSlot(23, 15)).toBe(30);
  });

  it("clamps to 0..1440", () => {
    expect(snapMinutesToSlot(-10, 15)).toBe(0);
    expect(snapMinutesToSlot(MINUTES_PER_DAY + 100, 15)).toBe(MINUTES_PER_DAY);
  });
});

describe("segmentsOverlap", () => {
  it("returns false when only touching", () => {
    const a: WeekViewSegment = { id: "a", startMs: 0, endMs: 100 };
    const b: WeekViewSegment = { id: "b", startMs: 100, endMs: 200 };
    expect(segmentsOverlap(a, b)).toBe(false);
  });

  it("returns true when overlapping", () => {
    const a: WeekViewSegment = { id: "a", startMs: 0, endMs: 150 };
    const b: WeekViewSegment = { id: "b", startMs: 100, endMs: 200 };
    expect(segmentsOverlap(a, b)).toBe(true);
  });
});

describe("assignWeekColumnLayout (connected groups)", () => {
  it("merges transitive overlap into one group sharing columnCount", () => {
    // A: 9:00-10:00, B: 9:30-10:30, C: 10:00-11:00 — A and C only touch at 10:00 (no overlap)
    const base = new Date("2025-01-01T00:00:00.000Z").getTime();
    const h = (x: number) => base + x * 60 * 60 * 1000;
    const A: WeekViewSegment = { id: "a", startMs: h(9), endMs: h(10) };
    const B: WeekViewSegment = { id: "b", startMs: h(9.5), endMs: h(10.5) };
    const C: WeekViewSegment = { id: "c", startMs: h(10), endMs: h(11) };

    const map = assignWeekColumnLayout([A, B, C]);
    expect(map.get("a")?.columnCount).toBe(2);
    expect(map.get("b")?.columnCount).toBe(2);
    expect(map.get("c")?.columnCount).toBe(2);
    expect(map.get("a")?.column).toBe(0);
    expect(map.get("b")?.column).toBe(1);
    expect(map.get("c")?.column).toBe(0);
  });

  it("assigns independent groups separately", () => {
    const base = new Date("2025-01-01T00:00:00.000Z").getTime();
    const m = (min: number) => base + min * 60 * 1000;
    const a: WeekViewSegment = { id: "a", startMs: m(0), endMs: m(30) };
    const b: WeekViewSegment = { id: "b", startMs: m(60), endMs: m(90) };
    const map = assignWeekColumnLayout([a, b]);
    expect(map.get("a")?.columnCount).toBe(1);
    expect(map.get("b")?.columnCount).toBe(1);
  });
});

describe("WEEK_VIEW_SLOT_MINUTES", () => {
  it("is 15", () => {
    expect(WEEK_VIEW_SLOT_MINUTES).toBe(15);
  });
});
