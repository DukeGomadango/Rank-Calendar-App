import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  getCalendarPermissionsForUser,
  ensureUserCanEditCalendar,
  getMockPermissions,
} from "./permission";

let calendarResponse: { data: { id: string; owner_id: string } | null; error: unknown };
let shareResponse: { data: { role_id: string } | null; error: unknown };
let rolePermsResponse: { data: { permission: string }[]; error: unknown };
let getUserResponse: { data: { user: { id: string } | null } };

const mockFrom = vi.fn((table: string) => {
  if (table === "role_permissions") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(rolePermsResponse)),
      })),
    };
  }
  if (table === "shares") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: () => Promise.resolve(shareResponse) })),
        })),
      })),
    };
  }
  // calendars
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: () => Promise.resolve(calendarResponse),
      })),
    })),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      schema: vi.fn(() => ({ from: mockFrom })),
      auth: {
        getUser: vi.fn(() => Promise.resolve(getUserResponse)),
      },
    })
  ),
}));

vi.mock("@/lib/errors", () => ({
  throwDataLayerError: vi.fn((err: Error) => {
    throw err;
  }),
}));

const mockCookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookiesGet,
    })
  ),
}));

describe("getCalendarPermissionsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calendarResponse = { data: null, error: null };
    shareResponse = { data: null, error: null };
    rolePermsResponse = { data: [], error: null };
  });

  it("カレンダーが存在しない場合は全て false を返す", async () => {
    calendarResponse = { data: null, error: null };

    const result = await getCalendarPermissionsForUser("cal-1", "user-1");

    expect(result).toEqual({
      isOwner: false,
      canEditSchedule: false,
      canViewCalendar: false,
      canViewTable: false,
      canViewBorders: false,
      canViewMemo: false,
      canViewTargetActual: false,
      canViewRank: false,
      canViewEvents: false,
      canViewSchedulePersonal: false,
      canViewScheduleSecret: false,
      canViewScheduleStream: false,
    });
  });

  it("オーナーの場合は全権限 true を返す", async () => {
    calendarResponse = {
      data: { id: "cal-1", owner_id: "user-1" },
      error: null,
    };

    const result = await getCalendarPermissionsForUser("cal-1", "user-1");

    expect(result.isOwner).toBe(true);
    expect(result.canEditSchedule).toBe(true);
    expect(result.canViewCalendar).toBe(true);
    expect(result.canViewTable).toBe(true);
  });

  it("共有されていないユーザーは全て false を返す", async () => {
    calendarResponse = {
      data: { id: "cal-1", owner_id: "other-user" },
      error: null,
    };
    shareResponse = { data: null, error: null };

    const result = await getCalendarPermissionsForUser("cal-1", "user-1");

    expect(result.isOwner).toBe(false);
    expect(result.canEditSchedule).toBe(false);
    expect(result.canViewCalendar).toBe(false);
  });

  it("共有ユーザーはロールに応じた閲覧権限を返す", async () => {
    calendarResponse = {
      data: { id: "cal-1", owner_id: "other-user" },
      error: null,
    };
    shareResponse = { data: { role_id: "role-1" }, error: null };
    rolePermsResponse = {
      data: [
        { permission: "view_calendar" },
        { permission: "view_table" },
        { permission: "view_rank" },
      ],
      error: null,
    };

    const result = await getCalendarPermissionsForUser("cal-1", "user-1");

    expect(result.isOwner).toBe(false);
    expect(result.canEditSchedule).toBe(false);
    expect(result.canViewCalendar).toBe(true);
    expect(result.canViewTable).toBe(true);
    expect(result.canViewRank).toBe(true);
    expect(result.canViewBorders).toBe(false);
    expect(result.canViewMemo).toBe(false);
  });

  it("calendars の select がエラー時は throwDataLayerError する", async () => {
    calendarResponse = {
      data: null,
      error: { message: "db error", code: "ERR" },
    };

    await expect(
      getCalendarPermissionsForUser("cal-1", "user-1")
    ).rejects.toThrow(/calendars select failed/);
  });
});

describe("ensureUserCanEditCalendar", () => {
  beforeEach(() => {
    getUserResponse = { data: { user: { id: "user-1" } } };
    calendarResponse = { data: { id: "cal-1", owner_id: "user-1" }, error: null };
    shareResponse = { data: null, error: null };
    rolePermsResponse = { data: [], error: null };
  });

  it("未ログイン時は「未ログイン」で throw する", async () => {
    getUserResponse = { data: { user: null } };

    await expect(ensureUserCanEditCalendar("cal-1")).rejects.toThrow("未ログイン");
  });

  it("オーナーなら throw しない", async () => {
    await expect(ensureUserCanEditCalendar("cal-1")).resolves.toBeUndefined();
  });

  it("編集権限がない場合は「このカレンダーを編集する権限がありません」で throw する", async () => {
    calendarResponse = {
      data: { id: "cal-1", owner_id: "other-user" },
      error: null,
    };
    shareResponse = { data: { role_id: "role-1" }, error: null };
    rolePermsResponse = {
      data: [{ permission: "view_calendar" }],
      error: null,
    };

    await expect(ensureUserCanEditCalendar("cal-1")).rejects.toThrow(
      "このカレンダーを編集する権限がありません"
    );
  });
});

describe("getMockPermissions", () => {
  it("クッキーが listener の場合はリスナー用権限を返す", async () => {
    mockCookiesGet.mockReturnValue({ value: "listener" });

    const result = await getMockPermissions();

    expect(result.isOwner).toBe(false);
    expect(result.canEditSchedule).toBe(false);
    expect(result.canViewCalendar).toBe(true);
    expect(result.canViewTable).toBe(true);
    expect(result.canViewBorders).toBe(false);
    expect(result.canViewMemo).toBe(false);
  });

  it("クッキーが owner または未設定の場合はオーナー用権限を返す", async () => {
    mockCookiesGet.mockReturnValue({ value: "owner" });

    const result = await getMockPermissions();

    expect(result.isOwner).toBe(true);
    expect(result.canEditSchedule).toBe(true);
  });

  it("クッキーが無い場合もオーナー用権限を返す", async () => {
    mockCookiesGet.mockReturnValue(undefined);

    const result = await getMockPermissions();

    expect(result.canEditSchedule).toBe(true);
  });
});
