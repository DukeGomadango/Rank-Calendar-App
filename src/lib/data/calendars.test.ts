import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("react", async (importOriginal) => {
  const mod = await importOriginal() as { cache: (f: unknown) => unknown };
  return { ...mod, cache: (f: unknown) => f };
});

import {
  getOrCreateDefaultCalendarForUser,
  hasOwnedCalendar,
  listCalendarsForUser,
  getCalendarById,
} from "./calendars";

const maybeSingleMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
          })),
          limit: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
          maybeSingle: maybeSingleMock,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: singleMock })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    }));
    const schema = vi.fn(() => ({ from }));
    return Promise.resolve({ schema });
  }),
}));

vi.mock("@/lib/errors", () => ({
  throwDataLayerError: vi.fn((err: Error) => {
    throw err;
  }),
}));

describe("calendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    singleMock.mockResolvedValue({ data: null, error: null });
  });

  describe("getOrCreateDefaultCalendarForUser", () => {
    it("既存カレンダーがあればそれを返す", async () => {
      const existing = { id: "cal-1", name: "マイカレンダー" };
      maybeSingleMock.mockResolvedValueOnce({ data: existing, error: null });

      const result = await getOrCreateDefaultCalendarForUser("user-1");

      expect(result).toEqual(existing);
    });

    it("既存が無ければ作成して返す", async () => {
      maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
      const inserted = { id: "cal-new", name: "メインカレンダー" };
      singleMock.mockResolvedValueOnce({ data: inserted, error: null });

      const result = await getOrCreateDefaultCalendarForUser("user-1");

      expect(result).toEqual(inserted);
    });

    it("select がエラー時は throwDataLayerError する", async () => {
      maybeSingleMock.mockResolvedValueOnce({
        data: null,
        error: { message: "db error", code: "ERR" },
      });

      await expect(getOrCreateDefaultCalendarForUser("user-1")).rejects.toThrow(
        /calendars select failed/
      );
    });
  });

  describe("hasOwnedCalendar", () => {
    it("カレンダーが1件あれば true", async () => {
      maybeSingleMock.mockResolvedValueOnce({
        data: { id: "cal-1" },
        error: null,
      });

      const result = await hasOwnedCalendar("user-1");

      expect(result).toBe(true);
    });

    it("カレンダーが無ければ false", async () => {
      maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

      const result = await hasOwnedCalendar("user-1");

      expect(result).toBe(false);
    });
  });

  describe("listCalendarsForUser", () => {
    it("カレンダー一覧を返す", async () => {
      const orderResolve = {
        data: [
          { id: "cal-1", name: "メイン" },
          { id: "cal-2", name: "サブ" },
        ],
        error: null,
      };
      const orderMock = vi.fn(() => {
        const limit = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
        return Object.assign(Promise.resolve(orderResolve), { limit });
      });
      vi.mocked(
        (await import("@/lib/supabase/server")).createSupabaseServerClient
      ).mockResolvedValueOnce({
        schema: vi.fn(() => ({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ order: orderMock })),
            })),
          })),
        })),
      } as never);

      const result = await listCalendarsForUser("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("メイン");
    });
  });

  describe("getCalendarById", () => {
    it("ID で取得したカレンダーを返す", async () => {
      const cal = { id: "cal-1", name: "テスト" };
      maybeSingleMock.mockResolvedValueOnce({ data: cal, error: null });

      const result = await getCalendarById("cal-1");

      expect(result).toEqual(cal);
    });

    it("存在しなければ null", async () => {
      maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

      const result = await getCalendarById("cal-missing");

      expect(result).toBeNull();
    });
  });
});
