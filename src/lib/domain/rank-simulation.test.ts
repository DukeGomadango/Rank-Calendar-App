import { describe, expect, it } from "vitest";

import {
  buildDisplayRankCycles,
  findRankUpAchievedDateInCycle,
  simulateRankCyclesForward,
} from "./rank-simulation";
import type { EntryForRankForecast } from "./rank";

function entry(
  date: string,
  actual: number,
  skip = false,
): [string, EntryForRankForecast] {
  return [date, { actual_plus: actual, skip_pass_used: skip }];
}

describe("simulateRankCyclesForward", () => {
  it("splits cycle early when cumulative reaches 18 mid-period", () => {
    const entriesByDate = new Map<string, EntryForRankForecast>([
      entry("2024-06-01", 6),
      entry("2024-06-02", 6),
      entry("2024-06-03", 6),
      entry("2024-06-04", 0),
      entry("2024-06-05", 0),
      entry("2024-06-06", 0),
      entry("2024-06-07", 0),
    ]);

    const cycles = simulateRankCyclesForward({
      cycleStart: "2024-06-01",
      initialRank: "C5",
      entriesByDate,
      getEntryForForecast: (d) => entriesByDate.get(d),
      todayJst: "2024-06-10",
      simulateToDate: "2024-06-30",
    });

    expect(cycles.length).toBeGreaterThanOrEqual(2);
    expect(cycles[0]).toMatchObject({
      start: "2024-06-01",
      end: "2024-06-03",
      rank: "C5",
    });
    expect(cycles[1].start).toBe("2024-06-04");
    expect(cycles[1].rank).toBe("B1");
  });

  it("keeps full cycle when total stays below 18 until period end", () => {
    const entriesByDate = new Map<string, EntryForRankForecast>([
      entry("2024-06-01", 2),
      entry("2024-06-02", 2),
      entry("2024-06-03", 2),
      entry("2024-06-04", 2),
      entry("2024-06-05", 2),
      entry("2024-06-06", 2),
      entry("2024-06-07", 2),
    ]);

    const cycles = simulateRankCyclesForward({
      cycleStart: "2024-06-01",
      initialRank: "C5",
      entriesByDate,
      getEntryForForecast: (d) => entriesByDate.get(d),
      todayJst: "2024-06-10",
      simulateToDate: "2024-06-15",
    });

    expect(cycles[0]).toMatchObject({
      start: "2024-06-01",
      end: "2024-06-07",
      rank: "C5",
    });
  });
});

describe("findRankUpAchievedDateInCycle", () => {
  it("returns first date when cumulative hits 18", () => {
    const achieved = findRankUpAchievedDateInCycle(
      [
        { date: "2024-06-01", actual_plus: 6, skip_pass_used: false },
        { date: "2024-06-02", actual_plus: 6, skip_pass_used: false },
        { date: "2024-06-03", actual_plus: 6, skip_pass_used: false },
      ],
      "2024-06-01",
      "2024-06-07",
    );
    expect(achieved).toBe("2024-06-03");
  });
});

describe("buildDisplayRankCycles", () => {
  it("prepends history and simulates from current cycle start", () => {
    const entriesByDate = new Map<string, EntryForRankForecast>([
      entry("2024-07-28", 6),
      entry("2024-07-29", 6),
      entry("2024-07-30", 6),
    ]);

    const { displayCycles, forecastLabel } = buildDisplayRankCycles({
      history: [
        {
          cycle_start_date: "2024-07-01",
          cycle_end_date: "2024-07-07",
          rank_during: "C4",
        },
      ],
      rankState: {
        rank_cycle_start_date: "2024-07-28",
        rank_reset_date: "2024-08-03",
        current_rank: "A3",
        skip_pass_remaining: 0,
      },
      entriesByDate,
      todayJst: "2024-07-31",
      simulateToDate: "2024-08-31",
    });

    expect(displayCycles[0].rank).toBe("C4");
    expect(displayCycles.some((c) => c.rank === "A3")).toBe(true);
    expect(forecastLabel).toMatch(/A3 →/);
  });
});
