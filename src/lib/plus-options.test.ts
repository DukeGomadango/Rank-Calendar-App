import { describe, expect, it } from "vitest";
import { normalizePlusValue, PLUS_SELECT_VALUES } from "./plus-options";

describe("plus-options", () => {
  describe("PLUS_SELECT_VALUES", () => {
    it("contains expected values", () => {
      expect(PLUS_SELECT_VALUES).toEqual([0, 1, 2, 4, 6]);
    });
  });

  describe("normalizePlusValue", () => {
    it("returns 0 for null and undefined", () => {
      expect(normalizePlusValue(null)).toBe(0);
      expect(normalizePlusValue(undefined)).toBe(0);
    });

    it("returns the value when it is in PLUS_SELECT_VALUES", () => {
      expect(normalizePlusValue(0)).toBe(0);
      expect(normalizePlusValue(1)).toBe(1);
      expect(normalizePlusValue(2)).toBe(2);
      expect(normalizePlusValue(4)).toBe(4);
      expect(normalizePlusValue(6)).toBe(6);
    });

    it("returns 0 for values not in PLUS_SELECT_VALUES", () => {
      expect(normalizePlusValue(3)).toBe(0);
      expect(normalizePlusValue(5)).toBe(0);
      expect(normalizePlusValue(18)).toBe(0);
      expect(normalizePlusValue(-1)).toBe(0);
    });
  });
});
