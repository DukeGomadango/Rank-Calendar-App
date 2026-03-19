import { describe, it, expect } from "vitest";

import {
  getRankTier,
  getRankBarClasses,
  getRankBarLineClass,
  getRankBarTextClass,
  getRankBarDashedLineClass,
  getRankBarDashedLineColorClass,
  getRankBarVerticalBorderClass,
  getRankBadgeClass,
} from "./rank-styles";

describe("rank-styles", () => {
  it("getRankTier は先頭文字からティアを返す（大小文字を吸収）", () => {
    expect(getRankTier("d1")).toBe("D");
    expect(getRankTier("C2")).toBe("C");
    expect(getRankTier("b3")).toBe("B");
    expect(getRankTier("A1")).toBe("A");
    expect(getRankTier("s")).toBe("S");
  });

  it("無効/未設定のランクは null を返す", () => {
    expect(getRankTier(null)).toBeNull();
    expect(getRankTier("")).toBeNull();
    expect(getRankTier("X1")).toBeNull();
  });

  it("各クラス取得は未設定時にニュートラル（または null）にフォールバックする", () => {
    expect(getRankBarClasses(null)).toContain("zinc");
    expect(getRankBarLineClass(null)).toContain("zinc");
    expect(getRankBarTextClass(null)).toContain("zinc");
    expect(getRankBarDashedLineClass(null)).toContain("border-dashed");
    expect(getRankBarDashedLineColorClass(null)).toContain("border-dashed");
    expect(getRankBarVerticalBorderClass(null, false)).toContain("zinc");
    expect(getRankBarVerticalBorderClass(null, true)).toContain("zinc");
    expect(getRankBadgeClass(null)).toBeNull();
  });

  it("有効なランクは適切なクラス文字列を返す", () => {
    expect(getRankBarClasses("S1")).toContain("bg-");
    expect(getRankBarLineClass("A1")).toContain("bg-");
    expect(getRankBarTextClass("B1")).toContain("text-");
    expect(getRankBarDashedLineClass("C1")).toContain("border-t-4");
    expect(getRankBarDashedLineColorClass("D1")).toContain("border-dashed");
    expect(getRankBarVerticalBorderClass("S1", true)).toContain("border-");
    expect(getRankBadgeClass("S1")).toContain("bg-");
  });
});

