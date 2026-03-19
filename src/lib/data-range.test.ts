import { describe, it, expect } from "vitest";

import { DEFAULT_DATA_RANGE_DAYS, parseDaysParam } from "./data-range";

describe("parseDaysParam", () => {
  it("null/undefined はデフォルトを返す", () => {
    expect(parseDaysParam(null)).toBe(DEFAULT_DATA_RANGE_DAYS);
    expect(parseDaysParam(undefined)).toBe(DEFAULT_DATA_RANGE_DAYS);
  });

  it("有効な数値文字列はそのまま返す", () => {
    expect(parseDaysParam("7")).toBe(7);
    expect(parseDaysParam("30")).toBe(30);
  });

  it("無効な値はデフォルトにフォールバックする", () => {
    expect(parseDaysParam("")).toBe(DEFAULT_DATA_RANGE_DAYS);
    expect(parseDaysParam("0")).toBe(DEFAULT_DATA_RANGE_DAYS);
    expect(parseDaysParam("999")).toBe(DEFAULT_DATA_RANGE_DAYS);
    expect(parseDaysParam("abc")).toBe(DEFAULT_DATA_RANGE_DAYS);
  });
});

