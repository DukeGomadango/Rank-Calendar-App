import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveScheduleEntry } from "./actions";

const mockUpsert = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetOrCreateCalendarRankState = vi.fn();
const mockExtendRankResetDate = vi.fn();
const mockDecrementSkipPassRemaining = vi.fn();
const mockEnsureSkipPassIncrementForLastWeek = vi.fn();

vi.mock("@/lib/data/schedule-entries", () => ({
  upsertScheduleEntryForDate: (...args: unknown[]) => mockUpsert(...args),
  getScheduleEntriesInRange: vi.fn(),
}));

vi.mock("@/lib/data/calendar-rank-state", () => ({
  getOrCreateCalendarRankState: (...args: unknown[]) =>
    mockGetOrCreateCalendarRankState(...args),
  extendRankResetDate: (...args: unknown[]) => mockExtendRankResetDate(...args),
  decrementSkipPassRemaining: (...args: unknown[]) =>
    mockDecrementSkipPassRemaining(...args),
  ensureSkipPassIncrementForLastWeek: (...args: unknown[]) =>
    mockEnsureSkipPassIncrementForLastWeek(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

describe("dashboard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue(undefined);
    mockGetOrCreateCalendarRankState.mockResolvedValue({
      rank_cycle_start_date: "2024-01-08",
      rank_reset_date: "2024-01-21",
    });
    mockExtendRankResetDate.mockResolvedValue(undefined);
    mockDecrementSkipPassRemaining.mockResolvedValue(undefined);
    mockEnsureSkipPassIncrementForLastWeek.mockResolvedValue(undefined);
  });

  describe("saveScheduleEntry", () => {
    it("parses FormData and calls upsertScheduleEntryForDate", async () => {
      const formData = new FormData();
      formData.set("calendar_id", "cal-123");
      formData.set("date", "2024-01-15");
      formData.set("target_plus", "6");
      formData.set("actual_plus", "4");
      formData.set("border_plus2", "2");
      formData.set("border_plus4", "4");
      formData.set("border_plus6", "6");
      formData.set("memo", "メモ");
      formData.set("skip_pass_used", "on");

      await saveScheduleEntry(formData);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledWith("cal-123", {
        date: "2024-01-15",
        target_plus: 6,
        actual_plus: 4,
        border_plus2: 2,
        border_plus4: 4,
        border_plus6: 6,
        event_id: null,
        memo: "メモ",
        skip_pass_used: true,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/data");
      expect(mockGetOrCreateCalendarRankState).toHaveBeenCalledWith("cal-123");
      expect(mockExtendRankResetDate).toHaveBeenCalledWith(
        "cal-123",
        "2024-01-15",
        "2024-01-08",
        "2024-01-21"
      );
      expect(mockDecrementSkipPassRemaining).toHaveBeenCalledWith("cal-123", "2024-01-15");
      expect(mockEnsureSkipPassIncrementForLastWeek).toHaveBeenCalledWith("cal-123");
    });

    it("throws when calendar_id or date is missing", async () => {
      const formData = new FormData();
      formData.set("calendar_id", "cal-123");
      // date missing

      await expect(saveScheduleEntry(formData)).rejects.toThrow(
        "カレンダーIDまたは日付が不正です"
      );
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("sends null for empty optional fields", async () => {
      const formData = new FormData();
      formData.set("calendar_id", "cal-1");
      formData.set("date", "2024-01-01");
      // no target_plus, actual_plus, memo, skip_pass_used off

      await saveScheduleEntry(formData);

      expect(mockUpsert).toHaveBeenCalledWith("cal-1", {
        date: "2024-01-01",
        target_plus: null,
        actual_plus: null,
        border_plus2: null,
        border_plus4: null,
        border_plus6: null,
        event_id: null,
        memo: null,
        skip_pass_used: false,
      });
      expect(mockGetOrCreateCalendarRankState).not.toHaveBeenCalled();
      expect(mockExtendRankResetDate).not.toHaveBeenCalled();
      expect(mockDecrementSkipPassRemaining).not.toHaveBeenCalled();
      expect(mockEnsureSkipPassIncrementForLastWeek).toHaveBeenCalledWith("cal-1");
    });
  });
});
