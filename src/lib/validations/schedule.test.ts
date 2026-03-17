import { describe, expect, it } from "vitest";

import { MAX_BORDER_VALUE } from "@/lib/border-constants";
import { saveScheduleEntrySchema } from "./schedule";

describe("saveScheduleEntrySchema", () => {
  const base = {
    calendar_id: "550e8400-e29b-41d4-a716-446655440000",
    date: "2024-01-15",
  };

  it("accepts border and ansuko values up to MAX_BORDER_VALUE", () => {
    const result = saveScheduleEntrySchema.safeParse({
      ...base,
      ansuko_baseline: String(MAX_BORDER_VALUE),
      border_plus2: String(MAX_BORDER_VALUE),
      border_plus4: String(MAX_BORDER_VALUE),
      border_plus6: String(MAX_BORDER_VALUE),
      target_plus: "6",
      actual_plus: "4",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.ansuko_baseline).toBe(MAX_BORDER_VALUE);
    expect(result.data.border_plus2).toBe(MAX_BORDER_VALUE);
    expect(result.data.border_plus4).toBe(MAX_BORDER_VALUE);
    expect(result.data.border_plus6).toBe(MAX_BORDER_VALUE);
  });

  it("rejects border values greater than MAX_BORDER_VALUE", () => {
    const result = saveScheduleEntrySchema.safeParse({
      ...base,
      ansuko_baseline: String(MAX_BORDER_VALUE + 1),
      border_plus2: "0",
      border_plus4: "0",
      border_plus6: "0",
      target_plus: "6",
      actual_plus: "4",
    });

    expect(result.success).toBe(false);
  });

  it("accepts plus values up to 9,999", () => {
    const result = saveScheduleEntrySchema.safeParse({
      ...base,
      target_plus: "9999",
      actual_plus: "9999",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.target_plus).toBe(9_999);
    expect(result.data.actual_plus).toBe(9_999);
  });

  it("rejects plus values greater than 9,999", () => {
    const result = saveScheduleEntrySchema.safeParse({
      ...base,
      target_plus: "10000",
      actual_plus: "10000",
    });

    expect(result.success).toBe(false);
  });
});

