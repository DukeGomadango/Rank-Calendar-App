"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserLike = { id: string; email?: string | null } | null;

type Props = {
  user: UserLike;
  calendarName: string;
};

function UserAvatar({ email }: { email: string | null }) {
  const name = email?.split("@")[0] ?? "?";
  const src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=96&background=94a3b8&color=fff`;

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

export function AccountSection({ user, calendarName }: Props) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
              <UserAvatar email={user.email ?? null} />
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {user.email ?? "（メール未設定）"}
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
        </>
      ) : (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          開発用モック表示です。ログインするとアカウント情報が表示されます。
        </p>
      )}
    </section>
  );
}
