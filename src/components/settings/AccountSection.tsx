"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { updateAvatarUrlAction } from "@/app/(dashboard)/dashboard/settings/actions";

type UserLike = { id: string } | null;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 2;

type Props = {
  user: UserLike;
  calendarName: string;
  /** 表示名（他ユーザーにはメールを見せないため表示名のみ表示） */
  displayName?: string | null;
  /** アバター画像URL（未設定なら表示名から自動生成） */
  avatarUrl?: string | null;
  /** 表示名更新アクション（設定ページで渡す）。未指定なら編集UIは出さない */
  updateDisplayNameAction?: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
};

function UserAvatar({
  displayName,
  avatarUrl,
}: { displayName: string | null; avatarUrl?: string | null }) {
  const name = displayName?.trim() || "?";
  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=96&background=94a3b8&color=fff`;
  const src = avatarUrl?.trim() || fallbackSrc;

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function AccountSection({
  user,
  calendarName,
  displayName,
  avatarUrl,
  updateDisplayNameAction,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayNameValue, setDisplayNameValue] = useState(displayName ?? "");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);

  useEffect(() => {
    setDisplayNameValue(displayName ?? "");
  }, [displayName]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "JPEG / PNG / WebP / GIF のみ対応しています" });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setMessage({ type: "error", text: `ファイルは ${MAX_SIZE_MB}MB 以下にしてください` });
      return;
    }
    setMessage(null);
    setAvatarPending(true);
    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        setMessage({ type: "error", text: uploadError.message || "アップロードに失敗しました" });
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updateAvatarUrlAction(publicUrl);
      if (result.ok) {
        setMessage({ type: "ok", text: "アイコンを更新しました" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "更新に失敗しました" });
      }
    } finally {
      setAvatarPending(false);
    }
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleUpdateDisplayName(formData: FormData) {
    if (!updateDisplayNameAction) return;
    setMessage(null);
    const result = await updateDisplayNameAction(formData);
    if (result.ok) {
      setMessage({ type: "ok", text: "表示名を更新しました" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error ?? "更新に失敗しました" });
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="mb-3 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        アカウント
      </h2>
      {user ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                <UserAvatar displayName={displayName ?? null} avatarUrl={avatarUrl ?? null} />
                {updateDisplayNameAction != null && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_TYPES.join(",")}
                      className="sr-only"
                      aria-label="アイコン画像を選択"
                      onChange={handleAvatarUpload}
                      disabled={avatarPending}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarPending}
                      className="absolute bottom-0 right-0 rounded-full bg-zinc-600 px-1.5 py-0.5 text-[9px] text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {avatarPending ? "…" : "変更"}
                    </button>
                  </>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {displayName?.trim() || "表示名未設定"}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  使用中: {calendarName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ログアウト
            </button>
          </div>
          {updateDisplayNameAction != null && (
            <form
              action={handleUpdateDisplayName}
              className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-700"
            >
              <label className="sr-only" htmlFor="account-display-name">
                表示名
              </label>
              <input
                id="account-display-name"
                type="text"
                name="display_name"
                value={displayNameValue}
                onChange={(e) => setDisplayNameValue(e.target.value)}
                placeholder="表示名（他ユーザーに表示）"
                className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-[11px] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                maxLength={100}
              />
              <button
                type="submit"
                className="rounded-md bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-600"
              >
                表示名を保存
              </button>
              {message && (
                <p
                  className={`w-full text-[11px] ${message.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {message.text}
                </p>
              )}
            </form>
          )}
        </>
      ) : (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          開発用モック表示です。ログインするとアカウント情報が表示されます。
        </p>
      )}
    </section>
  );
}
