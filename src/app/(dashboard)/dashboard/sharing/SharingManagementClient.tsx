"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast-context";
import { CopyInviteUrl } from "./CopyInviteUrl";
import {
  assignRoleToUser,
  createInviteLinkAction,
  deleteInviteLink,
  removeShare,
  type CreateInviteLinkActionResult,
} from "./actions";

type RoleOption = { id: string; name: string };
type InviteLinkItem = { id: string; token: string; role_id: string | null };
export type ShareMemberItem = {
  user_id: string;
  display_name: string | null;
  redeemed_at: string | null;
  role_id: string | null;
  shared_at: string | null;
};

type Props = {
  calendarId: string;
  roles: RoleOption[];
  initialInviteLinks: InviteLinkItem[];
  initialMembers: ShareMemberItem[];
};

export function SharingManagementClient({
  calendarId,
  roles,
  initialInviteLinks,
  initialMembers,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [inviteLinks, setInviteLinks] = useState<InviteLinkItem[]>(initialInviteLinks);
  const [members, setMembers] = useState<ShareMemberItem[]>(initialMembers);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [busyInviteDeleteIds, setBusyInviteDeleteIds] = useState<Record<string, true>>({});
  const [busyMemberIds, setBusyMemberIds] = useState<Record<string, true>>({});

  const roleById = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name])),
    [roles]
  );

  const withBusyInvite = (id: string, fn: () => Promise<void>) => {
    setBusyInviteDeleteIds((prev) => ({ ...prev, [id]: true }));
    fn().finally(() => {
      setBusyInviteDeleteIds((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
    });
  };

  const withBusyMember = (id: string, fn: () => Promise<void>) => {
    setBusyMemberIds((prev) => ({ ...prev, [id]: true }));
    fn().finally(() => {
      setBusyMemberIds((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
    });
  };

  return (
    <>
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          招待リンク
        </h2>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
          リンクを共有し、踏んだユーザーを「招待済み」に追加します。ロールを選んで発行すると、参加時に自動でそのロールが付与されます。
        </p>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (isCreatingInvite || isPending) return;
            const formData = new FormData(e.currentTarget);
            const tempId = `temp-invite-${Date.now()}`;
            const optimisticRole = (formData.get("role_id") as string | null) || null;
            setIsCreatingInvite(true);
            setInviteLinks((prev) => [
              { id: tempId, token: "発行中...", role_id: optimisticRole && optimisticRole !== "none" ? optimisticRole : null },
              ...prev,
            ]);
            startTransition(async () => {
              try {
                const result = (await createInviteLinkAction(
                  formData
                )) as CreateInviteLinkActionResult;
                if (!result?.ok) throw new Error(result?.message ?? "招待リンクの発行に失敗しました");
                setInviteLinks((prev) => {
                  const withoutTemp = prev.filter((v) => v.id !== tempId);
                  if (result.link) {
                    return [{ id: result.link.id, token: result.link.token, role_id: result.link.role_id ?? null }, ...withoutTemp];
                  }
                  return withoutTemp;
                });
                showToast("招待リンクを発行しました");
                router.refresh();
              } catch (err) {
                setInviteLinks((prev) => prev.filter((v) => v.id !== tempId));
                showToast(err instanceof Error ? err.message : "招待リンクの発行に失敗しました");
              } finally {
                setIsCreatingInvite(false);
              }
            });
          }}
        >
          <input type="hidden" name="calendar_id" value={calendarId} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              このリンクで付与するロール
            </span>
            <select
              name="role_id"
              className="w-48 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              disabled={isCreatingInvite || isPending}
            >
              <option value="">未設定（後で手動付与）</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isCreatingInvite || isPending}
            className="rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-600 disabled:opacity-60"
          >
            {isCreatingInvite || isPending ? "処理中..." : "招待リンクを発行"}
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
                <CopyInviteUrl calendarId={calendarId} token={link.token} />
                {link.role_id && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    （{roleById.get(link.role_id) ?? "ロール"}）
                  </span>
                )}
                <button
                  type="button"
                  disabled={!!busyInviteDeleteIds[link.id] || link.id.startsWith("temp-invite-")}
                  className="text-[11px] text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:hover:text-zinc-400 dark:hover:text-red-400"
                  onClick={() => {
                    const snapshot = inviteLinks;
                    setInviteLinks((prev) => prev.filter((v) => v.id !== link.id));
                    withBusyInvite(link.id, async () => {
                      try {
                        const fd = new FormData();
                        fd.set("calendar_id", calendarId);
                        fd.set("invite_link_id", link.id);
                        const result = await deleteInviteLink(fd);
                        if (!result.ok) throw new Error(result.message ?? "削除に失敗しました");
                        showToast("招待リンクを削除しました");
                      } catch (err) {
                        setInviteLinks(snapshot);
                        showToast(err instanceof Error ? err.message : "削除に失敗しました");
                      }
                    });
                  }}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          招待済みユーザー
        </h2>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
          招待リンクで登録したユーザーにロールを付与すると、その権限でカレンダーを閲覧できます。
        </p>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
            <p>まだ誰も招待リンクから登録していません。</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => {
              const busy = !!busyMemberIds[m.user_id];
              const currentRoleId = m.role_id ?? "none";
              return (
                <li
                  key={m.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-100 py-2 px-2 dark:border-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs text-zinc-900 dark:text-zinc-50">
                      {m.display_name ?? m.user_id.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      招待: {m.redeemed_at ? new Date(m.redeemed_at).toLocaleString("ja") : "不明"} / 共有: {m.shared_at ? new Date(m.shared_at).toLocaleString("ja") : "未付与"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (busy) return;
                        const fd = new FormData(e.currentTarget);
                        const nextRole = (fd.get("role_id") as string) || "none";
                        const prev = members;
                        setMembers((curr) =>
                          curr.map((row) =>
                            row.user_id === m.user_id
                              ? { ...row, role_id: nextRole === "none" ? null : nextRole, shared_at: new Date().toISOString() }
                              : row
                          )
                        );
                        withBusyMember(m.user_id, async () => {
                          try {
                            fd.set("calendar_id", calendarId);
                            fd.set("user_id", m.user_id);
                            const result = await assignRoleToUser(fd);
                            if (!result.ok) throw new Error(result.message ?? "ロール反映に失敗しました");
                            showToast("ロールを反映しました");
                          } catch (err) {
                            setMembers(prev);
                            showToast(err instanceof Error ? err.message : "ロール反映に失敗しました");
                          } finally {
                            router.refresh();
                          }
                        });
                      }}
                    >
                      <input type="hidden" name="calendar_id" value={calendarId} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <select
                        name="role_id"
                        defaultValue={currentRoleId}
                        disabled={busy}
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
                        disabled={busy}
                        className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 disabled:opacity-60 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      >
                        {busy ? "処理中..." : "反映"}
                      </button>
                    </form>
                    <button
                      type="button"
                      disabled={busy}
                      className="text-[11px] text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-red-400"
                      onClick={() => {
                        const prev = members;
                        setMembers((curr) =>
                          curr
                            .map((row) =>
                              row.user_id === m.user_id
                                ? { ...row, role_id: null, shared_at: null }
                                : row
                            )
                            .filter((row) => !(row.user_id === m.user_id && row.redeemed_at == null))
                        );
                        withBusyMember(m.user_id, async () => {
                          try {
                            const fd = new FormData();
                            fd.set("calendar_id", calendarId);
                            fd.set("user_id", m.user_id);
                            const result = await removeShare(fd);
                            if (!result.ok) throw new Error(result.message ?? "共有解除に失敗しました");
                            showToast("共有を解除しました");
                          } catch (err) {
                            setMembers(prev);
                            showToast(err instanceof Error ? err.message : "共有解除に失敗しました");
                          } finally {
                            router.refresh();
                          }
                        });
                      }}
                    >
                      共有を解除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

