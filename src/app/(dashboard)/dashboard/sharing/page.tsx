import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveCalendarContextForUser,
} from "@/lib/data/calendars";
import { listRolesForCalendar, getPermissionsForRoles } from "@/lib/data/roles";
import { listInviteLinksForCalendar } from "@/lib/data/invite-links";
import { listRedemptionsForCalendar } from "@/lib/data/invite-redemptions";
import { listSharesWithProfilesForCalendar } from "@/lib/data/shares";
import { PERMISSION_LABELS } from "@/lib/data/permissions";
import { SharingPageClient } from "./SharingPageClient";
import { SharingManagementClient, type ShareMemberItem } from "./SharingManagementClient";
import { PendingSubmitButton } from "./PendingSubmitButton";
import {
  createRole,
  deleteRole,
  saveRolePermissions,
  noopCreateRole,
  noopDeleteRole,
  noopSaveRolePermissions,
  noopCreateInviteLinkAction,
  noopDeleteInviteLink,
  noopAssignRoleToUser,
} from "./actions";
import { CopyInviteUrl } from "./CopyInviteUrl";
import { PERM_GROUP_BASIC, PERM_GROUP_SENSITIVE } from "./sharing-constants";

type PageProps = { searchParams?: Promise<{ calendarId?: string }> };

export default async function SharingPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;
  const params = searchParams ? await searchParams : undefined;
  const urlCalendarId = params?.calendarId ?? null;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const roles: { id: string; name: string }[] = [
      { id: "mock-role-1", name: "リスナー（閲覧のみ）" },
      { id: "mock-role-2", name: "リスナー（ランク・ボーダー表示）" },
    ];
    const inviteLinks: { id: string; token: string; role_id?: string | null }[] = [
      { id: "mock-link-1", token: "mock-token-abc123", role_id: "mock-role-1" },
    ];
    const redemptions: { id: string; user_id: string; redeemed_at: string; display_name: string | null }[] = [
      { id: "mock-red-1", user_id: "mock-user-1", redeemed_at: new Date().toISOString(), display_name: "サンプルリスナー" },
    ];
    const shares: { user_id: string; role_id: string }[] = [
      { user_id: "mock-user-1", role_id: "mock-role-1" },
    ];
    const shareByUserId = new Map(shares.map((s) => [s.user_id, s.role_id]));
    const permsByRoleId = new Map<string, string[]>([
      [
        "mock-role-1",
        ["view_calendar", "view_table", "view_target_actual", "view_rank", "view_events", "view_schedule_stream", "view_schedule_personal"],
      ],
      [
        "mock-role-2",
        ["view_calendar", "view_table", "view_borders", "view_memo", "view_target_actual", "view_rank", "view_events", "view_schedule_stream", "view_schedule_personal"],
      ],
    ]);

    return (
      <div className="space-y-6">
        <SharingPageClient />
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。ロール・招待リンク・招待済みユーザーの見た目を確認できます。</p>
        </section>
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">共有</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {calendar.name ?? "メインカレンダー"} をリスナーに共有するためのロールと招待リンクを管理します。
          </p>
        </header>

        {/* ロール */}
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">ロール</h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            ロールごとに「何を見せるか」を権限で設定し、招待したユーザーに付与します。
          </p>
          <form action={noopCreateRole} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">新規ロール名</span>
              <input
                type="text"
                name="name"
                required
                className="w-40 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="例）リスナーA"
              />
            </label>
            <button type="submit" className="rounded-md bg-accent-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-accent-600">
              追加
            </button>
          </form>
          <ul className="space-y-4">
            {roles.map((role) => (
              <li key={role.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{role.name}</span>
                  <form action={noopDeleteRole}>
                    <input type="hidden" name="role_id" value={role.id} />
                    <button type="submit" className="text-[11px] text-zinc-500 hover:text-red-600 dark:hover:text-zinc-400 dark:hover:text-red-400">
                      削除
                    </button>
                  </form>
                </div>
                <form action={noopSaveRolePermissions} className="space-y-3">
                  <input type="hidden" name="role_id" value={role.id} />
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">基本情報</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {PERM_GROUP_BASIC.map((key) => (
                        <label key={key} className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                          <input type="checkbox" name={`perm_${key}`} defaultChecked={permsByRoleId.get(role.id)?.includes(key)} className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400" />
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">センシティブ情報</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {PERM_GROUP_SENSITIVE.map((key) => (
                        <label key={key} className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                          <input type="checkbox" name={`perm_${key}`} defaultChecked={permsByRoleId.get(role.id)?.includes(key)} className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400" />
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                    権限を保存
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        {/* 招待リンク */}
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">招待リンク</h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            リンクを共有し、踏んだユーザーを「招待済み」に追加します。ロールを選んで発行すると、参加時に自動でそのロールが付与されます。
          </p>
          <form action={noopCreateInviteLinkAction} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">このリンクで付与するロール</span>
              <select name="role_id" className="w-48 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
                <option value="">未設定（後で手動付与）</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-600">
              招待リンクを発行
            </button>
          </form>
          <ul className="space-y-2">
            {inviteLinks.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-100 py-2 px-2 dark:border-zinc-800">
                <CopyInviteUrl calendarId={calendar.id} token={link.token} />
                <form action={noopDeleteInviteLink}>
                  <input type="hidden" name="invite_link_id" value={link.id} />
                  <button type="submit" className="text-[11px] text-zinc-500 hover:text-red-600 dark:hover:text-zinc-400 dark:hover:text-red-400">
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        {/* 招待済みユーザー */}
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">招待済みユーザー</h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            招待リンクで登録したユーザーにロールを付与すると、その権限でカレンダーを閲覧できます。
          </p>
          <ul className="space-y-2">
            {redemptions.map((r) => {
              const currentRoleId = shareByUserId.get(r.user_id) ?? "none";
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-100 py-2 px-2 dark:border-zinc-800">
                  <span className="text-xs text-zinc-900 dark:text-zinc-50">{r.display_name ?? r.user_id.slice(0, 8)}</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {new Date(r.redeemed_at).toLocaleString("ja")}
                  </span>
                  <form action={noopAssignRoleToUser} className="flex items-center gap-1">
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <select
                      name="role_id"
                      defaultValue={currentRoleId}
                      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      <option value="none">未付与</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                      反映
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  if (!user) redirect("/login");
  const { currentCalendar, accessibleCalendars } = await resolveCalendarContextForUser(
    user.id,
    urlCalendarId
  );
  const hasOwned = accessibleCalendars.some((c) => c.isOwner);
  if (!hasOwned) {
    redirect("/dashboard");
  }
  if (!currentCalendar) redirect("/dashboard/settings");
  if (!currentCalendar.isOwner) {
    const firstOwned = accessibleCalendars.find((c) => c.isOwner);
    if (firstOwned) redirect(`/dashboard/sharing?calendarId=${encodeURIComponent(firstOwned.id)}`);
    redirect("/dashboard/settings");
  }
  const [roles, inviteLinks, redemptions, shares] = await Promise.all([
    listRolesForCalendar(currentCalendar.id),
    listInviteLinksForCalendar(currentCalendar.id),
    listRedemptionsForCalendar(currentCalendar.id),
    listSharesWithProfilesForCalendar(currentCalendar.id),
  ]);

  const membersByUserId = new Map<string, ShareMemberItem>();
  for (const s of shares) {
    membersByUserId.set(s.user_id, {
      user_id: s.user_id,
      display_name: s.display_name ?? null,
      redeemed_at: null,
      role_id: s.role_id,
      shared_at: s.created_at,
    });
  }
  for (const r of redemptions) {
    const prev = membersByUserId.get(r.user_id);
    membersByUserId.set(r.user_id, {
      user_id: r.user_id,
      display_name: prev?.display_name ?? r.display_name ?? null,
      redeemed_at: r.redeemed_at,
      role_id: prev?.role_id ?? null,
      shared_at: prev?.shared_at ?? null,
    });
  }
  const members = [...membersByUserId.values()].sort((a, b) => {
    const at = a.redeemed_at ?? a.shared_at ?? "";
    const bt = b.redeemed_at ?? b.shared_at ?? "";
    return bt.localeCompare(at);
  });
  const permsByRoleId = await getPermissionsForRoles(roles.map((role) => role.id));

  if (process.env.NODE_ENV !== "production") {
    console.info("[perf] sharing_page", {
      calendarId: currentCalendar.id,
      roleCount: roles.length,
      inviteLinkCount: inviteLinks.length,
      memberCount: members.length,
    });
  }

  return (
    <div className="space-y-6">
      <SharingPageClient />
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          共有
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {currentCalendar.name ?? "メインカレンダー"}
          をリスナーに共有するためのロールと招待リンクを管理します。
        </p>
      </header>

      {roles.length === 0 && inviteLinks.length === 0 && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-xs dark:border-sky-800 dark:bg-sky-950/30">
          <p className="font-medium text-sky-800 dark:text-sky-200">
            リスナーを招待するには
          </p>
          <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-300">
            まず下でロールを追加し、招待リンクを発行してください。リンクを共有した相手が登録すると、招待済み一覧に表示され、ロールを付与してスケジュールを共有できます。
          </p>
        </section>
      )}

      {/* ロール */}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          ロール
        </h2>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
          ロールごとに「何を見せるか」を権限で設定し、招待したユーザーに付与します。
        </p>
        <form action={createRole} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="calendar_id" value={currentCalendar.id} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              新規ロール名
            </span>
            <input
              type="text"
              name="name"
              required
              className="w-40 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="例）リスナーA"
            />
          </label>
          <PendingSubmitButton
            idleLabel="追加"
            className="rounded-md bg-accent-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-accent-600 disabled:opacity-60"
          />
        </form>
        {roles.length === 0 ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            まだロールがありません。上でロール名を入力して追加してください。
          </p>
        ) : (
          <ul className="space-y-4">
            {roles.map((role) => (
              <li
                key={role.id}
                className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {role.name}
                  </span>
                  <form action={deleteRole}>
                    <input type="hidden" name="calendar_id" value={currentCalendar.id} />
                    <input type="hidden" name="role_id" value={role.id} />
                    <PendingSubmitButton
                      idleLabel="削除"
                      className="text-[11px] text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:hover:text-zinc-400 dark:hover:text-red-400"
                    />
                  </form>
                </div>
                <form action={saveRolePermissions} className="space-y-3">
                  <input type="hidden" name="calendar_id" value={currentCalendar.id} />
                  <input type="hidden" name="role_id" value={role.id} />
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">基本情報</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {PERM_GROUP_BASIC.map((key) => (
                        <label key={key} className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                          <input type="checkbox" name={`perm_${key}`} defaultChecked={permsByRoleId.get(role.id)?.includes(key)} className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400" />
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">センシティブ情報</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {PERM_GROUP_SENSITIVE.map((key) => (
                        <label key={key} className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                          <input type="checkbox" name={`perm_${key}`} defaultChecked={permsByRoleId.get(role.id)?.includes(key)} className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400" />
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <PendingSubmitButton
                    idleLabel="権限を保存"
                    className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 disabled:opacity-60 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SharingManagementClient
        calendarId={currentCalendar.id}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        initialInviteLinks={inviteLinks.map((l) => ({ id: l.id, token: l.token, role_id: l.role_id ?? null }))}
        initialMembers={members}
      />
    </div>
  );
}
