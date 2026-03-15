import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getScheduleEntriesInRange,
  upsertScheduleEntryForDate,
  type ScheduleEntryUpsertInput,
} from "./schedule-entries";

const orderMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@/lib/supabase/server", () => {
  return {
    createSupabaseServerClient: vi.fn(() => {
      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: orderMock,
              })),
            })),
          })),
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: singleMock,
          })),
        })),
      }) );
      const schema = vi.fn(() => ({ from }));
      return Promise.resolve({ schema });
    }),
  };
});

describe("schedule-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderMock.mockResolvedValue({ data: [], error: null });
    singleMock.mockResolvedValue({ data: null, error: null });
  });

  describe("getScheduleEntriesInRange", () => {
    it("returns empty array when no data", async () => {
      const result = await getScheduleEntriesInRange(
        "cal-1",
        "2024-01-01",
        "2024-01-31"
      );
      expect(result).toEqual([]);
    });

    it("returns rows when data exists", async () => {
      const rows = [
        {
          id: "e1",
          date: "2024-01-01",
          border_plus2: 2,
          border_plus4: 4,
          border_plus6: 6,
          event_id: null,
          memo: "m",
          target_plus: 6,
          actual_plus: 6,
          skip_pass_used: false,
        },
      ];
      orderMock.mockResolvedValue({ data: rows, error: null });

      const result = await getScheduleEntriesInRange(
        "cal-1",
        "2024-01-01",
        "2024-01-01"
      );
      expect(result).toEqual(rows);
    });
  });

  describe("upsertScheduleEntryForDate", () => {
    it("calls upsert with correct payload and returns data", async () => {
      const input: ScheduleEntryUpsertInput = {
        date: "2024-01-15",
        border_plus2: 2,
        border_plus4: 4,
        border_plus6: 6,
        event_id: null,
        memo: "test",
        target_plus: 6,
        actual_plus: 4,
        skip_pass_used: false,
      };
      const returned = { id: "new-id", ...input };
      singleMock.mockResolvedValue({ data: returned, error: null });

      const result = await upsertScheduleEntryForDate("cal-1", input);

      expect(result).toEqual(returned);
    });

    it("throws when supabase returns error", async () => {
      singleMock.mockResolvedValue({
        data: null,
        error: { message: "conflict", code: "23505" },
      });

      await expect(
        upsertScheduleEntryForDate("cal-1", {
          date: "2024-01-01",
          border_plus2: null,
          border_plus4: null,
          border_plus6: null,
          event_id: null,
          memo: null,
          target_plus: null,
          actual_plus: null,
          skip_pass_used: false,
        })
      ).rejects.toThrow(/schedule_entries upsert failed/);
    });
  });
});
