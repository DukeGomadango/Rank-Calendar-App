import { redirect } from "next/navigation";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInviteLinkByTokenForRedeem } from "@/lib/data/invite-links";
import { redeemInvite } from "@/lib/data/invite-redemptions";
import { upsertShareWithServiceRole } from "@/lib/data/shares";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ calendarId: string; token: string }>;
};

function InviteInvalidLink({ calendarId, token }: { calendarId: string; token: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white/90 p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          招待リンクが無効または期限切れです
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          リンクが間違っているか、有効期限が切れています。オーナーに新しい招待リンクを発行してもらってください。
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href={`/login?redirectTo=${encodeURIComponent(`/invite/${calendarId}/${token}`)}`}
            className="inline-block rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            ログイン
          </Link>
          <Link
            href="/"
            className="inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            トップへ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function InviteRedeemPage({ params }: Props) {
  const { calendarId, token } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTo = `/invite/${calendarId}/${token}`;
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  let link;
  try {
    link = await getInviteLinkByTokenForRedeem(calendarId, token);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[invite] getInviteLinkByTokenForRedeem threw:", err);
    }
    return <InviteInvalidLink calendarId={calendarId} token={token} />;
  }
  if (!link) {
    return <InviteInvalidLink calendarId={calendarId} token={token} />;
  }
  await redeemInvite(link.id, user.id);
  if (link.role_id) {
    await upsertShareWithServiceRole(link.calendar_id, user.id, link.role_id);
  }
  const autoRoleAssigned = !!link.role_id;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white/90 p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          招待を登録しました
        </h1>
        {autoRoleAssigned ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            ロールが自動で付与されました。ダッシュボードからスケジュールを閲覧できます。
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              カレンダーオーナーがロールを付与すると、権限に応じてスケジュールを閲覧できるようになります。
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              ロールが付与されるまでお待ちください。
            </p>
          </>
        )}
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          ダッシュボードへ
        </Link>
      </div>
    </div>
  );
}
