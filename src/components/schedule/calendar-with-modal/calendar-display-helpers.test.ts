import { describe, expect, it } from "vitest";

import type { CalendarScheduleRow } from "@/lib/data/schedules";

import {
  filterSchedulesForMonthCell,
  formatScheduleTimeRangeLabel,
  getTargetActualDisplay,
} from "./calendar-display-helpers";

function row(partial: Partial<CalendarScheduleRow>): CalendarScheduleRow {
  return {
    id: partial.id ?? "1",
    calendar_id: partial.calendar_id ?? "c1",
    date: partial.date ?? "2026-01-01",
    end_date: partial.end_date ?? null,
    start_time: partial.start_time ?? null,
    end_time: partial.end_time ?? null,
    is_all_day: partial.is_all_day ?? false,
    title: partial.title ?? "t",
    kind: partial.kind ?? null,
    visibility: partial.visibility ?? null,
    color_id: partial.color_id ?? null,
    memo: partial.memo ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
  };
}

describe("formatScheduleTimeRangeLabel", () => {
  it("終日", () => {
    expect(formatScheduleTimeRangeLabel(row({ is_all_day: true }))).toBe("終日");
  });

  it("開始・終了", () => {
    expect(
      formatScheduleTimeRangeLabel(
        row({ is_all_day: false, start_time: "14:00:00", end_time: "16:30:00" })
      )
    ).toBe("14:00 – 16:30");
  });

  it("開始のみ", () => {
    expect(formatScheduleTimeRangeLabel(row({ start_time: "09:15:00", end_time: null }))).toBe(
      "09:15"
    );
  });

  it("時刻なし", () => {
    expect(formatScheduleTimeRangeLabel(row({ start_time: null, end_time: null }))).toBe("--:--");
  });
});

describe("getTargetActualDisplay", () => {
  it("compact では字と余白を詰める", () => {
    const d = getTargetActualDisplay(6, 3, false, true);
    expect(d.actualClass).toContain("text-[8px]");
    expect(d.actualClass).toContain("px-1");
    expect(d.actualClass).not.toContain("px-1.5");
  });
});

describe("filterSchedulesForMonthCell", () => {
  it("stream personal secret null のみ残す", () => {
    const list = [
      row({ id: "a", kind: "stream" }),
      row({ id: "b", kind: "personal" }),
      row({ id: "c", kind: "secret" }),
      row({ id: "d", kind: null }),
      row({ id: "e", kind: "other" }),
    ];
    const out = filterSchedulesForMonthCell(list);
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b", "c", "d"]);
  });
});
