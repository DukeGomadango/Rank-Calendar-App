import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profiles";
import { ListenerWelcome } from "@/components/onboarding/ListenerWelcome";
import { getCurrentCalendarForUser } from "@/lib/data/calendars";

type PageProps = {
  searchParams?: Promise<{ calendarId?: string }> | { calendarId?: string };
};

export default async function InvitePendingPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = searchParams
    ? (typeof (searchParams as Promise<unknown>).then === "function"
      ? await (searchParams as Promise<{ calendarId?: string }>)
      : (searchParams as { calendarId?: string }))
    : {};
  const calendarId = params.calendarId?.trim() ?? "";
  if (!calendarId) {
    redirect("/dashboard/settings");
  }

  // 既に閲覧可能になっている場合は通常ダッシュボードへ戻す。
  const currentCalendar = await getCurrentCalendarForUser(user.id, calendarId);
  if (currentCalendar?.id === calendarId) {
    redirect(`/dashboard?calendarId=${encodeURIComponent(calendarId)}`);
  }

  // 招待を受諾した本人のみ承認待ちページを閲覧できる。
  const supabaseService = createSupabaseServiceRoleClient();
  const { data: inviteLinks, error: linksError } = await supabaseService
    .schema("iriam")
    .from("invite_links")
    .select("id")
    .eq("calendar_id", calendarId)
    .limit(200);
  if (linksError) {
    redirect("/dashboard/settings");
  }
  const inviteLinkIds = (inviteLinks ?? [])
    .map((r) => r?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (inviteLinkIds.length === 0) {
    redirect("/dashboard/settings");
  }
  const { data: redemptions, error: redemptionsError } = await supabaseService
    .schema("iriam")
    .from("invite_redemptions")
    .select("invite_link_id")
    .eq("user_id", user.id)
    .in("invite_link_id", inviteLinkIds)
    .limit(1);
  if (
    redemptionsError ||
    !Array.isArray(redemptions) ||
    redemptions.length === 0
  ) {
    redirect("/dashboard/settings");
  }

  const profile = await getProfile(user.id);
  const { data: cal } = await supabaseService
    .schema("iriam")
    .from("calendars")
    .select("name")
    .eq("id", calendarId)
    .maybeSingle();
  const calendarName = typeof cal?.name === "string" && cal.name.trim() ? cal.name : "このカレンダー";

  return (
    <div className="space-y-4">
      <ListenerWelcome
        calendarId={calendarId}
        calendarName={calendarName}
        displayName={profile?.display_name ?? null}
        redirectOnDismiss={false}
      />
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          招待の承認待ち
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          参加申請は完了しました。ライバーがロールを付与すると、このカレンダーを閲覧できます。
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-slate-800 dark:text-zinc-200">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          現在の状態: ロール未付与
        </p>
        <p className="mt-2 text-[12px] text-zinc-600 dark:text-zinc-400">
          ライバーの承認後に「再確認する」を押してください。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/dashboard?calendarId=${encodeURIComponent(calendarId)}`}
            className="inline-flex items-center rounded-xl bg-accent-500 px-3 py-2 text-xs font-medium text-white hover:bg-accent-600"
          >
            再確認する
          </Link>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center rounded-xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
          >
            設定へ
          </Link>
        </div>
      </section>
    </div>
  );
}
