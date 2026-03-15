import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { getOrCreateCalendarRankState } from "@/lib/data/calendar-rank-state";
import {
  updateCurrentRank,
  updateRankResetDate,
  noopUpdateCurrentRank,
  noopUpdateRankResetDate,
} from "@/app/(dashboard)/dashboard/actions";
import { updateDisplayNameAction } from "./actions";
import { getProfile } from "@/lib/data/profiles";
import { ViewModeToggle } from "@/components/settings/ViewModeToggle";
import { AccountSection } from "@/components/settings/AccountSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { AppAboutSection } from "@/components/settings/AppAboutSection";
import { RankSettingsForm } from "@/components/settings/RankSettingsForm";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  if (isDevMock) {
    const calendarId = "dev-mock";
    const currentRank = "A1";
    const rankResetDate = "2026-03-17";

    return (
      <div className="space-y-4">
        <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] text-amber-800 shadow-sm dark:bg-orange-500/20 dark:text-orange-400">
          <p>開発用モック表示です。データは保存されません。</p>
        </section>
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            設定
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            表示などの設定を行います。
          </p>
        </header>

        <AccountSection user={null} calendarName="開発用モック" />

        <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            ランク設定
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            IRIAM の現在ランクと集計周期のリセット日を合わせます。ランクズレやリセット日のずれがあるときにここで修正できます。
          </p>
          <RankSettingsForm
            calendarId={calendarId}
            currentRank={currentRank}
            rankResetDate={rankResetDate}
            onUpdateCurrentRank={noopUpdateCurrentRank}
            onUpdateRankResetDate={noopUpdateRankResetDate}
          />
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            表示設定
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            リスナーで閲覧するときの表示の濃さを切り替えられます。簡易＝最小限の情報、詳細＝より多くの情報を表示（編集はできません）。
          </p>
          <ViewModeToggle />
        </section>

        <DataManagementSection calendarId={calendarId} isMock />
        <AppAboutSection />
        <DangerZoneSection calendarId={calendarId} isMock />
      </div>
    );
  }

  if (!user) redirect("/login");
  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const [rankState, profile] = await Promise.all([
    getOrCreateCalendarRankState(calendar.id),
    getProfile(user.id),
  ]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          表示などの設定を行います。
        </p>
      </header>

      <AccountSection
        user={user}
        calendarName={calendar.name ?? "メインカレンダー"}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        updateDisplayNameAction={updateDisplayNameAction}
      />

      <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          ランク設定
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          IRIAM の現在ランクと集計周期のリセット日を合わせます。ランクズレやリセット日のずれがあるときにここで修正できます。
        </p>
        <RankSettingsForm
          calendarId={calendar.id}
          currentRank={rankState.current_rank}
          rankResetDate={rankState.rank_reset_date}
          onUpdateCurrentRank={updateCurrentRank}
          onUpdateRankResetDate={updateRankResetDate}
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          表示設定
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          リスナーで閲覧するときの表示の濃さを切り替えられます。簡易＝最小限の情報、詳細＝より多くの情報を表示（編集はできません）。
        </p>
        <ViewModeToggle />
      </section>

      <DataManagementSection calendarId={calendar.id} isMock={false} />
      <AppAboutSection />
      <DangerZoneSection calendarId={calendar.id} isMock={false} />
    </div>
  );
}

