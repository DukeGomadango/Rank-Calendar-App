import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listRolesForCalendar, getPermissionsForRole } from "@/lib/data/roles";
import { listInviteLinksForCalendar } from "@/lib/data/invite-links";
import { listRedemptionsForCalendar } from "@/lib/data/invite-redemptions";
import { listSharesForCalendar } from "@/lib/data/shares";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
} from "@/lib/data/permissions";
import {
  createRole,
  deleteRole,
  saveRolePermissions,
  createInviteLinkAction,
  deleteInviteLink,
  assignRoleToUser,
  noopCreateRole,
  noopDeleteRole,
  noopSaveRolePermissions,
  noopCreateInviteLinkAction,
  noopDeleteInviteLink,
  noopAssignRoleToUser,
} from "./actions";
import { CopyInviteUrl } from "./CopyInviteUrl";

export default async function SharingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const roles: { id: string; name: string }[] = [];
    const inviteLinks: { id: string; token: string }[] = [];
    const redemptions: { id: string; user_id: string; redeemed_at: string; display_name: string | null }[] = [];
    const shares: { user_id: string; role_id: string }[] = [];
    const shareByUserId = new Map(shares.map((s) => [s.user_id, s.role_id]));
    const permsByRoleId = new Map<string, string[]>();

    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。</p>
        </section>
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            共有
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {calendar.name ?? "メインカレンダー"}
            をリスナーに共有するためのロールと招待リンクを管理します。
          </p>
        </header>
        <section className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-xs dark:border-sky-800 dark:bg-sky-950/30">
          <p className="font-medium text-sky-800 dark:text-sky-200">
            リスナーを招待するには
          </p>
          <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-300">
            まず下でロールを追加し、招待リンクを発行してください。リンクを共有した相手が登録すると、招待済み一覧に表示され、ロールを付与してスケジュールを共有できます。
          </p>
        </section>
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            ロール
          </h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            ロールごとに「何を見せるか」を権限で設定し、招待したユーザーに付与します。
          </p>
          <form action={noopCreateRole} className="flex flex-wrap items-end gap-2">
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
            <button
              type="submit"
              className="rounded-md bg-pink-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-pink-600"
            >
              追加
            </button>
          </form>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            まだロールがありません。上でロール名を入力して追加してください。
          </p>
        </section>
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            招待リンク
          </h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            リンクを共有し、踏んだユーザーを「招待済み」に追加します。ロールは下の「招待済みユーザー」で付与してください。
          </p>
          <form action={noopCreateInviteLinkAction}>
            <button
              type="submit"
              className="rounded-md bg-pink-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-pink-600"
            >
              招待リンクを発行
            </button>
          </form>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            まだ招待リンクがありません。
          </p>
        </section>
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            招待済みユーザー
          </h2>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            招待リンクで登録したユーザーにロールを付与すると、その権限でカレンダーを閲覧できます。
          </p>
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
            <p>まだ誰も招待リンクから登録していません。</p>
            <p className="mt-1">
              招待リンクを発行して共有すると、登録した方がここに表示されます。ロールを付与するとスケジュールを閲覧できるようになります。
            </p>
          </div>
        </section>
      </div>
    );
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const [roles, inviteLinks, redemptions, shares] = await Promise.all([
    listRolesForCalendar(calendar.id),
    listInviteLinksForCalendar(calendar.id),
    listRedemptionsForCalendar(calendar.id),
    listSharesForCalendar(calendar.id),
  ]);

  const shareByUserId = new Map(shares.map((s) => [s.user_id, s.role_id]));
  const rolePermissions = await Promise.all(
    roles.map(async (r) => ({ roleId: r.id, perms: await getPermissionsForRole(r.id) }))
  );
  const permsByRoleId = new Map(rolePermissions.map((p) => [p.roleId, p.perms]));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          共有
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {calendar.name ?? "メインカレンダー"}
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
          <button
            type="submit"
            className="rounded-md bg-pink-500 px-3 py-1 text-[11px] font-medium text-white hover:bg-pink-600"
          >
            追加
          </button>
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
                    <input type="hidden" name="role_id" value={role.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-zinc-500 hover:text-red-600 dark:hover:text-zinc-400 dark:hover:text-red-400"
                    >
                      削除
                    </button>
                  </form>
                </div>
                <form action={saveRolePermissions} className="flex flex-wrap gap-x-4 gap-y-1">
                  <input type="hidden" name="role_id" value={role.id} />
                  {(PERMISSION_KEYS as readonly PermissionKey[]).map((key) => (
                    <label
                      key={key}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        name={`perm_${key}`}
                        defaultChecked={permsByRoleId.get(role.id)?.includes(key)}
                        className="rounded border-zinc-300 text-pink-500 focus:ring-pink-400"
                      />
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}
                  <button
                    type="submit"
                    className="ml-auto rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  >
                    権限を保存
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 招待リンク */}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          招待リンク
        </h2>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
          リンクを共有し、踏んだユーザーを「招待済み」に追加します。ロールは下の「招待済みユーザー」で付与してください。
        </p>
        <form action={createInviteLinkAction}>
          <button
            type="submit"
            className="rounded-md bg-pink-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-pink-600"
          >
            招待リンクを発行
          </button>
        </form>
        {inviteLinks.length === 0 ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            まだ招待リンクがありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {inviteLinks.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-2 rounded border border-zinc-100 py-2 px-2 dark:border-zinc-800"
              >
                <CopyInviteUrl calendarId={calendar.id} token={link.token} />
                <form action={deleteInviteLink}>
                  <input type="hidden" name="invite_link_id" value={link.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-zinc-500 hover:text-red-600 dark:hover:text-zinc-400 dark:hover:text-red-400"
                  >
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 招待済みユーザー */}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          招待済みユーザー
        </h2>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
          招待リンクで登録したユーザーにロールを付与すると、その権限でカレンダーを閲覧できます。
        </p>
        {redemptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
            <p>まだ誰も招待リンクから登録していません。</p>
            <p className="mt-1">
              招待リンクを発行して共有すると、登録した方がここに表示されます。ロールを付与するとスケジュールを閲覧できるようになります。
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {redemptions.map((r) => {
              const currentRoleId = shareByUserId.get(r.user_id) ?? "none";
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-zinc-100 py-2 px-2 dark:border-zinc-800"
                >
                  <span className="text-xs text-zinc-900 dark:text-zinc-50">
                    {r.display_name ?? r.user_id.slice(0, 8)}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {new Date(r.redeemed_at).toLocaleString("ja")}
                  </span>
                  <form action={assignRoleToUser} className="flex items-center gap-1">
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
                    <button
                      type="submit"
                      className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                    >
                      反映
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
