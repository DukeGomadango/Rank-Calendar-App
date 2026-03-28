import { describe, expect, it } from "vitest";
import {
  calculateCycleCumulativeByDate,
  calculateWeeklyRankProgress,
  getNextRank,
  getPreviousRank,
  judgeCycleRank,
  judgeWeeklyRank,
  projectedPlusForRankForecast,
} from "./rank";

describe("rank domain", () => {
  it("sums plus values per ISO week (JST)", () => {
    const weekly = calculateWeeklyRankProgress([
      { date: "2024-01-01", actual_plus: 2, skip_pass_used: false }, // Mon
      { date: "2024-01-02", actual_plus: 4, skip_pass_used: false },
      { date: "2024-01-07", actual_plus: 6, skip_pass_used: false }, // Sun same week
      { date: "2024-01-08", actual_plus: 2, skip_pass_used: false }, // next week
    ]);

    expect(weekly).toHaveLength(2);
    expect(weekly[0]).toMatchObject({
      weekStart: "2024-01-01",
      totalPlus: 12,
    });
    expect(weekly[1]).toMatchObject({
      weekStart: "2024-01-08",
      totalPlus: 2,
    });
  });

  it("ignores skip-pass days for totals but keeps zero-days as rest", () => {
    const weekly = calculateWeeklyRankProgress([
      { date: "2024-01-01", actual_plus: 6, skip_pass_used: false },
      { date: "2024-01-02", actual_plus: 6, skip_pass_used: true }, // should not count
      { date: "2024-01-03", actual_plus: 0, skip_pass_used: false }, // rest day counts as 0
      { date: "2024-01-04", actual_plus: 6, skip_pass_used: false },
    ]);

    expect(weekly).toHaveLength(1);
    expect(weekly[0].totalPlus).toBe(12);
  });

  it("judges rank up and intermediate thresholds", () => {
    const judgements = judgeWeeklyRank([
      { date: "2024-01-01", actual_plus: 6, skip_pass_used: false },
      { date: "2024-01-02", actual_plus: 6, skip_pass_used: false },
      { date: "2024-01-03", actual_plus: 6, skip_pass_used: false }, // total 18
    ]);

    expect(judgements).toHaveLength(1);
    expect(judgements[0]).toMatchObject({
      weekStart: "2024-01-01",
      totalPlus: 18,
      canRankUpNextDay: true,
      reachedIntermediate: true,
    });
  });

  describe("calculateCycleCumulativeByDate", () => {
    it("returns cumulative plus per date within cycle, excluding skip days", () => {
      const byDate = calculateCycleCumulativeByDate(
        [
          { date: "2024-01-01", actual_plus: 2, skip_pass_used: false },
          { date: "2024-01-02", actual_plus: 4, skip_pass_used: true },
          { date: "2024-01-03", actual_plus: 6, skip_pass_used: false },
        ],
        "2024-01-01",
        "2024-01-07"
      );
      expect(byDate["2024-01-01"]).toBe(2);
      expect(byDate["2024-01-02"]).toBe(2);
      expect(byDate["2024-01-03"]).toBe(8);
    });

    it("ignores entries outside cycle range", () => {
      const byDate = calculateCycleCumulativeByDate(
        [
          { date: "2024-01-08", actual_plus: 6, skip_pass_used: false },
        ],
        "2024-01-01",
        "2024-01-07"
      );
      expect(Object.keys(byDate)).toHaveLength(0);
    });
  });

  describe("projectedPlusForRankForecast", () => {
    const today = "2024-01-10";

    it("past: uses actual when present, else 0", () => {
      expect(
        projectedPlusForRankForecast(
          { actual_plus: 3, skip_pass_used: false },
          "2024-01-09",
          today,
        ),
      ).toBe(3);
      expect(
        projectedPlusForRankForecast(
          { actual_plus: null, target_plus: 5, skip_pass_used: false },
          "2024-01-09",
          today,
        ),
      ).toBe(0);
    });

    it("today or future: prefers actual when set, else target", () => {
      expect(
        projectedPlusForRankForecast(
          { actual_plus: 7, target_plus: 3, skip_pass_used: false },
          today,
          today,
        ),
      ).toBe(7);
      expect(
        projectedPlusForRankForecast(
          { actual_plus: null, target_plus: 3, skip_pass_used: false },
          today,
          today,
        ),
      ).toBe(3);
      expect(
        projectedPlusForRankForecast(
          { actual_plus: undefined, target_plus: 2, skip_pass_used: false },
          "2024-01-11",
          today,
        ),
      ).toBe(2);
    });

    it("actual 0 counts as entered (today uses 0 not target)", () => {
      expect(
        projectedPlusForRankForecast(
          { actual_plus: 0, target_plus: 4, skip_pass_used: false },
          today,
          today,
        ),
      ).toBe(0);
    });

    it("skip day is always 0", () => {
      expect(
        projectedPlusForRankForecast(
          { actual_plus: 6, target_plus: 3, skip_pass_used: true },
          "2024-01-09",
          today,
        ),
      ).toBe(0);
      expect(
        projectedPlusForRankForecast(
          { actual_plus: 6, target_plus: 3, skip_pass_used: true },
          today,
          today,
        ),
      ).toBe(0);
    });
  });

  describe("judgeCycleRank", () => {
    it("canRankUp when total >= 18", () => {
      expect(judgeCycleRank(18).canRankUp).toBe(true);
      expect(judgeCycleRank(17).canRankUp).toBe(false);
    });
    it("isKeep when 12 <= total < 18", () => {
      expect(judgeCycleRank(12).isKeep).toBe(true);
      expect(judgeCycleRank(17).isKeep).toBe(true);
      expect(judgeCycleRank(18).isKeep).toBe(false);
      expect(judgeCycleRank(11).isKeep).toBe(false);
    });
    it("isDown when total < 12", () => {
      expect(judgeCycleRank(11).isDown).toBe(true);
      expect(judgeCycleRank(0).isDown).toBe(true);
      expect(judgeCycleRank(12).isDown).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("calculateWeeklyRankProgress handles long multi-week ranges and gaps", () => {
      const weekly = calculateWeeklyRankProgress([
        // week 1
        { date: "2024-01-01", actual_plus: 6, skip_pass_used: false },
        { date: "2024-01-07", actual_plus: 6, skip_pass_used: false },
        // big gap, then week 4
        { date: "2024-01-22", actual_plus: 2, skip_pass_used: false },
        { date: "2024-01-28", actual_plus: 4, skip_pass_used: false },
      ]);

      expect(weekly).toHaveLength(2);
      expect(weekly[0]).toMatchObject({ weekStart: "2024-01-01", totalPlus: 12 });
      expect(weekly[1]).toMatchObject({ weekStart: "2024-01-22", totalPlus: 6 });
    });

    it("judgeWeeklyRank does not rank up when totalPlus is just below threshold", () => {
      const judgements = judgeWeeklyRank([
        { date: "2024-01-01", actual_plus: 6, skip_pass_used: false },
        { date: "2024-01-02", actual_plus: 6, skip_pass_used: false },
      ]); // total 12

      expect(judgements).toHaveLength(1);
      expect(judgements[0].totalPlus).toBe(12);
      expect(judgements[0].canRankUpNextDay).toBe(false);
    });

    it("calculateCycleCumulativeByDate skips days with skip_pass_used and out-of-range dates", () => {
      const byDate = calculateCycleCumulativeByDate(
        [
          { date: "2024-02-01", actual_plus: 2, skip_pass_used: false },
          { date: "2024-02-02", actual_plus: 6, skip_pass_used: true }, // ignored
          { date: "2024-02-03", actual_plus: 4, skip_pass_used: false },
          { date: "2024-01-31", actual_plus: 6, skip_pass_used: false }, // before cycle
        ],
        "2024-02-01",
        "2024-02-07",
      );

      expect(byDate["2024-02-01"]).toBe(2);
      expect(byDate["2024-02-02"]).toBe(2);
      expect(byDate["2024-02-03"]).toBe(6);
      expect(byDate["2024-01-31"]).toBeUndefined();
    });

    it("getNextRank/getPreviousRank behave at boundaries", () => {
      expect(getNextRank("S3")).toBe(null);
      expect(getPreviousRank("D")).toBe(null);
      expect(getPreviousRank(null)).toBe(null);
    });
  });

  describe("getNextRank", () => {
    it("returns next rank in order", () => {
      expect(getNextRank(null)).toBe("D");
      expect(getNextRank("D")).toBe("C1");
      expect(getNextRank("C5")).toBe("B1");
      expect(getNextRank("S3")).toBe(null);
    });
  });

  describe("getPreviousRank", () => {
    it("returns previous rank in order", () => {
      expect(getPreviousRank(null)).toBe(null);
      expect(getPreviousRank("D")).toBe(null);
      expect(getPreviousRank("C1")).toBe("D");
      expect(getPreviousRank("C5")).toBe("C4");
      expect(getPreviousRank("S3")).toBe("S2");
    });
  });
});

