import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getInviteLinkByTokenForRedeem } from "@/lib/data/invite-links";
import { redeemInvite } from "@/lib/data/invite-redemptions";
import { upsertShareWithServiceRole } from "@/lib/data/shares";
import { getProfile } from "@/lib/data/profiles";

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
  const supabaseService = createSupabaseServiceRoleClient();
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

  async function pickRoleIdForCalendarAccess(targetCalendarId: string, preferredRoleId: string | null): Promise<string | null> {
    // 招待リンクが「ロール未設定（role_id=null）」の場合に shares が作られず、
    // その結果 `/dashboard` が自分のデフォルトカレンダーへフォールバックする問題を防ぐ。
    // 可能なら `view_calendar` を持つロールを選ぶ。
    async function roleHasViewCalendar(roleId: string): Promise<boolean> {
      const { data, error } = await supabaseService
        .schema("iriam")
        .from("role_permissions")
        .select("permission")
        .eq("role_id", roleId)
        .eq("permission", "view_calendar")
        .limit(1);
      if (error) {
        // 選択不能な場合は安全側に倒す（最終的に null が返る）
        if (process.env.NODE_ENV === "development") {
          console.error("[invite] roleHasViewCalendar error:", error.message ?? "", error.code ?? "");
        }
        return false;
      }
      return Array.isArray(data) ? data.length > 0 : false;
    }

    if (preferredRoleId && await roleHasViewCalendar(preferredRoleId)) {
      return preferredRoleId;
    }

    const { data: roles, error: rolesError } = await supabaseService
      .schema("iriam")
      .from("roles")
      .select("id")
      .eq("calendar_id", targetCalendarId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (rolesError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[invite] pickRoleId roles select error:", rolesError.message ?? "", rolesError.code ?? "");
      }
      return null;
    }

    const roleIds = (roles ?? [])
      .map((r) => r?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (roleIds.length === 0) return null;

    for (const roleId of roleIds) {
      if (await roleHasViewCalendar(roleId)) return roleId;
    }

    // view_calendar を持つロールが見つからない場合でも shares を作って
    // アクセス可能一覧へ反映させる（最悪の場合でもフォールバック抑止が目的）。
    return roleIds[0] ?? null;
  }

  const ownerProfile = await getProfile(link.created_by);
  const ownerName = ownerProfile?.display_name?.trim() || "ライバー";

  await redeemInvite(link.id, user.id);

  const roleIdForShare = await pickRoleIdForCalendarAccess(link.calendar_id, link.role_id ?? null);
  if (roleIdForShare) {
    await upsertShareWithServiceRole(link.calendar_id, user.id, roleIdForShare);
  }

  const dashboardUrl = `/dashboard?fromInvite=1&calendarId=${encodeURIComponent(link.calendar_id)}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 text-xs text-zinc-700 backdrop-blur-sm dark:text-zinc-200">
      <div className="relative max-w-md w-full rounded-2xl border border-white/60 bg-white/85 p-8 text-center shadow-2xl backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/85">
        {/* オーブ: モーダルの周囲にだけ柔らかく散らす */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
          {/* メイン: sky 系（ブランド寄りの爽やかな色） */}
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-sky-400/24 blur-3xl" />
          <div className="absolute bottom-[-3rem] right-[-4rem] h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
          {/* サブ: indigo 系で奥行きを少しだけ追加 */}
          <div className="absolute -bottom-10 -left-12 h-44 w-44 rounded-full bg-indigo-500/16 blur-3xl" />
        </div>
        <div className="mb-4 flex items-center justify-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-accent-500 shadow-sm dark:bg-sky-900/40">
            <Sparkles className="h-6 w-6" strokeWidth={1.6} />
          </div>
        </div>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {ownerName} の作戦会議室へようこそ！
        </h1>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          これから一緒に、配信スケジュールやランクの作戦を共有できます。
          ダッシュボードから、今日の作戦をチェックしてみましょう。
        </p>
        <Link
          href={dashboardUrl}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-accent-500 px-5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:bg-accent-500 dark:hover:bg-accent-600"
        >
          応援の作戦を立てる
        </Link>
      </div>
    </div>
  );
}
