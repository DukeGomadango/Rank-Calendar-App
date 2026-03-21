import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveScheduleEntry } from "./schedule-entry-actions";

const mockUpsert = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetOrCreateCalendarRankState = vi.fn();
const mockExtendRankResetDate = vi.fn();
const mockRecalculateRankResetDateFromCurrentCycle = vi.fn();
const mockDecrementSkipPassRemaining = vi.fn();
const mockRestoreSkipPassRemaining = vi.fn();
const mockEnsureSkipPassIncrementForLastWeek = vi.fn();
const mockGetScheduleEntriesInRange = vi.fn();

vi.mock("@/lib/data/schedule-entries", () => ({
  upsertScheduleEntryForDate: (...args: unknown[]) => mockUpsert(...args),
  getScheduleEntriesInRange: (...args: unknown[]) =>
    mockGetScheduleEntriesInRange(...args),
}));

vi.mock("@/lib/data/calendar-rank-state", () => ({
  getOrCreateCalendarRankState: (...args: unknown[]) =>
    mockGetOrCreateCalendarRankState(...args),
  extendRankResetDate: (...args: unknown[]) => mockExtendRankResetDate(...args),
  recalculateRankResetDateFromCurrentCycle: (...args: unknown[]) =>
    mockRecalculateRankResetDateFromCurrentCycle(...args),
  decrementSkipPassRemaining: (...args: unknown[]) =>
    mockDecrementSkipPassRemaining(...args),
  restoreSkipPassRemaining: (...args: unknown[]) =>
    mockRestoreSkipPassRemaining(...args),
  ensureSkipPassIncrementForLastWeek: (...args: unknown[]) =>
    mockEnsureSkipPassIncrementForLastWeek(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/auth/permission", () => ({
  ensureUserCanEditCalendar: vi.fn().mockResolvedValue(undefined),
}));

describe("dashboard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue(undefined);
    mockGetOrCreateCalendarRankState.mockResolvedValue({
      rank_cycle_start_date: "2024-01-08",
      rank_reset_date: "2024-01-21",
    });
    mockGetScheduleEntriesInRange.mockResolvedValue([]);
    mockExtendRankResetDate.mockResolvedValue(undefined);
    mockRecalculateRankResetDateFromCurrentCycle.mockResolvedValue(undefined);
    mockDecrementSkipPassRemaining.mockResolvedValue(undefined);
    mockRestoreSkipPassRemaining.mockResolvedValue(undefined);
    mockEnsureSkipPassIncrementForLastWeek.mockResolvedValue(undefined);
  });

  const validCalendarId = "550e8400-e29b-41d4-a716-446655440000";

  describe("saveScheduleEntry", () => {
    it("parses FormData and calls upsertScheduleEntryForDate", async () => {
      const formData = new FormData();
      formData.set("calendar_id", validCalendarId);
      formData.set("date", "2024-01-15");
      formData.set("target_plus", "6");
      formData.set("actual_plus", "4");
      formData.set("border_plus2", "2");
      formData.set("border_plus4", "4");
      formData.set("border_plus6", "6");
      formData.set("memo", "メモ");
      formData.set("skip_pass_used", "on");

      const result = await saveScheduleEntry(formData);

      expect(result).toEqual({ ok: true });
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledWith(validCalendarId, {
        date: "2024-01-15",
        target_plus: 6,
        actual_plus: 4,
        ansuko_baseline: null,
        border_plus2: 2,
        border_plus4: 4,
        border_plus6: 6,
        event_id: null,
        memo: "メモ",
        skip_pass_used: true,
        stream_content: null,
        stream_content_color: null,
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/data");
      expect(mockGetOrCreateCalendarRankState).toHaveBeenCalledWith(validCalendarId);
      expect(mockExtendRankResetDate).toHaveBeenCalledWith(
        validCalendarId,
        "2024-01-15",
        "2024-01-08",
        "2024-01-21"
      );
      expect(mockDecrementSkipPassRemaining).toHaveBeenCalledWith(validCalendarId, "2024-01-15");
      expect(mockEnsureSkipPassIncrementForLastWeek).toHaveBeenCalledWith(validCalendarId);
    });

    it("returns errors when calendar_id or date is invalid", async () => {
      const formData = new FormData();
      formData.set("calendar_id", "cal-123");
      // date missing

      const result = await saveScheduleEntry(formData);

      expect(result).toEqual(expect.objectContaining({ ok: false, errors: expect.any(Object) }));
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("sends null for empty optional fields", async () => {
      const formData = new FormData();
      formData.set("calendar_id", validCalendarId);
      formData.set("date", "2024-01-01");
      // no target_plus, actual_plus, memo, skip_pass_used off

      const result = await saveScheduleEntry(formData);

      expect(result).toEqual({ ok: true });
      expect(mockUpsert).toHaveBeenCalledWith(validCalendarId, {
        date: "2024-01-01",
        target_plus: null,
        actual_plus: null,
        ansuko_baseline: null,
        border_plus2: null,
        border_plus4: null,
        border_plus6: null,
        event_id: null,
        memo: null,
        skip_pass_used: false,
        stream_content: null,
        stream_content_color: null,
      });
      expect(mockGetOrCreateCalendarRankState).not.toHaveBeenCalled();
      expect(mockExtendRankResetDate).not.toHaveBeenCalled();
      expect(mockDecrementSkipPassRemaining).not.toHaveBeenCalled();
      expect(mockEnsureSkipPassIncrementForLastWeek).toHaveBeenCalledWith(validCalendarId);
    });
  });
});
