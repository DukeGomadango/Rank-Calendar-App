import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveCalendarContextForUser,
} from "@/lib/data/calendars";
import { getOrCreateCalendarRankState } from "@/lib/data/calendar-rank-state";
import {
  updateCurrentRank,
  updateRankResetDate,
  noopUpdateCurrentRank,
  noopUpdateRankResetDate,
} from "@/app/(dashboard)/dashboard/rank-actions";
import { updateDisplayNameAction, createMyCalendarAction } from "./actions";
import { getProfile } from "@/lib/data/profiles";
import { ViewModeToggle } from "@/components/settings/ViewModeToggle";
import { AccountSection } from "@/components/settings/AccountSection";
import { DataManagementSection } from "@/components/settings/DataManagementSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";
import { AppAboutSection } from "@/components/settings/AppAboutSection";
import { LeaveCalendarSection } from "@/components/settings/LeaveCalendarSection";
import { RankSettingsForm } from "@/components/settings/RankSettingsForm";
import { AccountLinkingSection } from "@/components/settings/AccountLinkingSection";
import { CalendarSwitcher } from "@/components/settings/CalendarSwitcher";
import { SettingsPageClient } from "./SettingsPageClient";

type PageProps = { searchParams?: Promise<{ calendarId?: string }> };

export default async function SettingsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = searchParams ? await searchParams : undefined;
  const urlCalendarId = params?.calendarId ?? null;

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
        <SettingsPageClient />
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

  const { accessibleCalendars, currentCalendar } =
    await resolveCalendarContextForUser(user.id, urlCalendarId);

  if (!currentCalendar) {
    return (
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            設定
          </h1>
        </header>
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-slate-800 dark:text-zinc-300">
          <p>アクセスできるカレンダーがありません。</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            招待リンクから参加するか、トップへお戻りください。
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            トップへ
          </Link>
        </section>
      </div>
    );
  }

  const [rankState, profile] = await Promise.all([
    currentCalendar.isOwner ? getOrCreateCalendarRankState(currentCalendar.id) : null,
    getProfile(user.id),
  ]);

  if (process.env.NODE_ENV !== "production") {
    console.info("[perf] settings_page", {
      calendarId: currentCalendar.id,
      isOwner: currentCalendar.isOwner,
      calendarCount: accessibleCalendars.length,
    });
  }

  return (
    <div className="space-y-4">
      <SettingsPageClient />
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          表示などの設定を行います。
        </p>
      </header>

      <CalendarSwitcher
        calendars={accessibleCalendars}
        currentCalendarId={currentCalendar.id}
        createMyCalendarAction={createMyCalendarAction}
      />

      <AccountSection
        user={user}
        calendarName={currentCalendar.name ?? "メインカレンダー"}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        updateDisplayNameAction={updateDisplayNameAction}
      />

      <AccountLinkingSection isEnabled />

      {currentCalendar.isOwner && rankState && (
        <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            ランク設定
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            IRIAM の現在ランクと集計周期のリセット日を合わせます。ランクズレやリセット日のずれがあるときにここで修正できます。
          </p>
          <RankSettingsForm
            calendarId={currentCalendar.id}
            currentRank={rankState.current_rank}
            rankResetDate={rankState.rank_reset_date}
            onUpdateCurrentRank={updateCurrentRank}
            onUpdateRankResetDate={updateRankResetDate}
          />
        </section>
      )}

      <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          表示設定
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          リスナーで閲覧するときの表示の濃さを切り替えられます。簡易＝最小限の情報、詳細＝より多くの情報を表示（編集はできません）。
        </p>
        <ViewModeToggle />
      </section>

      {currentCalendar.isOwner ? (
        <DataManagementSection calendarId={currentCalendar.id} isMock={false} />
      ) : (
        <LeaveCalendarSection
          calendarId={currentCalendar.id}
          calendarName={currentCalendar.name ?? "このカレンダー"}
        />
      )}
      <AppAboutSection />
      {currentCalendar.isOwner && (
        <DangerZoneSection calendarId={currentCalendar.id} isMock={false} />
      )}
    </div>
  );
}

