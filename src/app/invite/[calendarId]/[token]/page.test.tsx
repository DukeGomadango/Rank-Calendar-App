import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JSX } from "react";
import InviteRedeemPage from "./page";

const mockRedirect = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();
const mockGetInviteLinkByTokenForRedeem = vi.fn();
const mockRedeemInvite = vi.fn();
const mockUpsertShareWithServiceRole = vi.fn();
const mockGetProfile = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
  createSupabaseServiceRoleClient: () => {
    const rolePermQuery = {
      select: vi.fn(() => rolePermQuery),
      eq: vi.fn(() => rolePermQuery),
      limit: vi.fn(() => Promise.resolve({ data: [{ permission: "view_calendar" }], error: null })),
    };

    return {
      schema: vi.fn(() => ({
        from: vi.fn(() => rolePermQuery),
      })),
    };
  },
}));

vi.mock("@/lib/data/invite-links", () => ({
  getInviteLinkByTokenForRedeem: (...args: unknown[]) =>
    mockGetInviteLinkByTokenForRedeem(...args),
}));

vi.mock("@/lib/data/invite-redemptions", () => ({
  redeemInvite: (...args: unknown[]) => mockRedeemInvite(...args),
}));

vi.mock("@/lib/data/shares", () => ({
  upsertShareWithServiceRole: (...args: unknown[]) =>
    mockUpsertShareWithServiceRole(...args),
}));

vi.mock("@/lib/data/profiles", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

async function renderInvitePage(params: { calendarId: string; token: string }): Promise<JSX.Element | void> {
  return InviteRedeemPage({ params: Promise.resolve(params) });
}

function findHref(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const candidate = node as {
    props?: { href?: unknown; children?: unknown };
  };
  if (typeof candidate.props?.href === "string") {
    return candidate.props.href;
  }
  const children = candidate.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const href = findHref(child);
      if (href) return href;
    }
    return null;
  }
  return findHref(children);
}

describe("InviteRedeemPage", () => {
  const calendarId = "cal-123";
  const token = "tok-abc";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });
    mockGetInviteLinkByTokenForRedeem.mockResolvedValue(null);
    mockGetProfile.mockResolvedValue({ display_name: "テストライバー" });
    mockRedeemInvite.mockResolvedValue(undefined);
    mockUpsertShareWithServiceRole.mockResolvedValue(undefined);
  });

  it("未ログイン時はログインページへredirectする", async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    await renderInvitePage({ calendarId, token });

    const expectedRedirectTo = `/login?redirectTo=${encodeURIComponent(
      `/invite/${calendarId}/${token}`,
    )}`;
    expect(mockRedirect).toHaveBeenCalledWith(expectedRedirectTo);
  });

  it("有効な招待リンクが存在しない場合は無効リンク用の画面を返す", async () => {
    mockGetInviteLinkByTokenForRedeem.mockResolvedValue(null);

    const result = await renderInvitePage({ calendarId, token });

    expect(result).toBeTruthy();
  });

  it("有効な招待リンクがある場合はredeemとshare作成を行い、ダッシュボードへのリンクを含むUIを返す", async () => {
    mockGetInviteLinkByTokenForRedeem.mockResolvedValue({
      id: "invite-1",
      calendar_id: "cal-123",
      created_by: "owner-1",
      role_id: "role-1",
    });

    const result = await renderInvitePage({ calendarId, token });

    expect(mockRedeemInvite).toHaveBeenCalledWith("invite-1", "user-1");
    expect(mockUpsertShareWithServiceRole).toHaveBeenCalledWith(
      "cal-123",
      "user-1",
      "role-1",
    );

    expect(result).toBeTruthy();
    const dashboardHref = findHref(result);
    expect(dashboardHref).toContain("fromInvite=1");
    expect(dashboardHref).toContain("calendarId=cal-123");
  });
});

