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
  });
});

