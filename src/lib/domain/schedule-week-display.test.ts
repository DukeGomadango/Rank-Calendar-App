import { describe, expect, it } from "vitest";
import {
  scheduleShowsInWeekAllDayRow,
  scheduleShowsInWeekTimeGrid,
} from "./schedule-week-display";
import type { CalendarScheduleRow } from "@/lib/data/schedules";

const base: CalendarScheduleRow = {
  id: "1",
  calendar_id: "c",
  date: "2025-01-01",
  end_date: null,
  start_time: null,
  end_time: null,
  is_all_day: false,
  title: "t",
  kind: null,
  visibility: null,
  color_id: null,
  memo: null,
  created_at: "",
};

describe("scheduleShowsInWeekAllDayRow", () => {
  it("is_all_day が true なら終日行", () => {
    expect(scheduleShowsInWeekAllDayRow({ ...base, is_all_day: true })).toBe(true);
  });

  it("00:00–23:59 の timed も終日行（誤分類の吸収）", () => {
    expect(
      scheduleShowsInWeekAllDayRow({
        ...base,
        start_time: "00:00:00",
        end_time: "23:59:00",
      })
    ).toBe(true);
  });

  it("00:00–24:00 も終日行", () => {
    expect(
      scheduleShowsInWeekAllDayRow({
        ...base,
        start_time: "00:00:00",
        end_time: "24:00:00",
      })
    ).toBe(true);
  });

  it("通常の時間帯は終日行にしない", () => {
    expect(
      scheduleShowsInWeekAllDayRow({
        ...base,
        start_time: "09:00:00",
        end_time: "10:00:00",
      })
    ).toBe(false);
  });
});

describe("scheduleShowsInWeekTimeGrid", () => {
  it("終日行に回るものは時間グリッドに出さない", () => {
    expect(
      scheduleShowsInWeekTimeGrid({
        ...base,
        is_all_day: true,
        start_time: "09:00:00",
        end_time: "10:00:00",
      })
    ).toBe(false);
  });

  it("通常 timed は時間グリッド", () => {
    expect(
      scheduleShowsInWeekTimeGrid({
        ...base,
        start_time: "09:00:00",
        end_time: "10:00:00",
      })
    ).toBe(true);
  });
});
