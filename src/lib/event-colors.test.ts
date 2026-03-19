import { describe, it, expect } from "vitest";

import { EVENT_PALETTE, getEventColorClasses, getEventColorDotClass } from "./event-colors";

describe("event-colors", () => {
  it("null はフォールバック色を返す", () => {
    const fallback = EVENT_PALETTE[0];
    expect(getEventColorDotClass(null)).toBe(fallback.swatch);

    const c = getEventColorClasses(null);
    expect(c.border).toBe(fallback.border);
    expect(c.bg).toBe(fallback.bg);
    expect(c.text).toBe(fallback.text);
    expect(c.leftBar).toBe(`border-l-4 ${fallback.border}`);
  });

  it("未知の色はフォールバックする", () => {
    const fallback = EVENT_PALETTE[0];
    expect(getEventColorDotClass("unknown")).toBe(fallback.swatch);
    expect(getEventColorClasses("unknown").border).toBe(fallback.border);
  });

  it("既知の色は対応するクラスを返す", () => {
    const blue = EVENT_PALETTE.find((c) => c.id === "blue");
    expect(blue).toBeTruthy();
    if (!blue) return;

    expect(getEventColorDotClass("blue")).toBe(blue.swatch);
    const c = getEventColorClasses("blue");
    expect(c.border).toBe(blue.border);
    expect(c.bg).toBe(blue.bg);
    expect(c.text).toBe(blue.text);
    expect(c.leftBar).toBe(`border-l-4 ${blue.border}`);
  });
});

