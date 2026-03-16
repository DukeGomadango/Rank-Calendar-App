import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCalendarForUser, hasOwnedCalendar } from "@/lib/data/calendars";
import { getProfile } from "@/lib/data/profiles";
import { listEventsForCalendar } from "@/lib/data/events";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { getOrCreateCalendarRankState } from "@/lib/data/calendar-rank-state";
import { toJstDateString, getJstWeekStart, addDays } from "@/lib/domain/calendar";
import { judgeCycleRank, getNextRank, type RankEntry } from "@/lib/domain/rank";
import { getMockSeedEntries } from "@/lib/mock-seed-data";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { CurrentRankBadge } from "@/components/dashboard/CurrentRankBadge";
import { WeeklyPlusSummary } from "@/components/dashboard/WeeklyPlusSummary";
import { HomeScheduleCard } from "@/components/schedule/HomeScheduleCard";
import { CalendarIcon, SparklesIcon } from "@/components/icons/DashboardIcons";
import {
  saveScheduleEntry,
  noopSaveEntry,
  applyRankUp,
  noopApplyRankUp,
} from "./actions";
import { ListenerWelcome } from "@/components/onboarding/ListenerWelcome";

const DEV_MOCK_BANNER = (
  <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] text-amber-800 shadow-sm dark:bg-orange-500/20 dark:text-orange-400">
    <p>開発用モック表示です。データは保存されません。</p>
  </section>
);

type PageProps = { searchParams?: Promise<{ fromInvite?: string; calendarId?: string }> };

export default async function DashboardHomePage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = searchParams ? await searchParams : undefined;
  const fromInvite = params?.fromInvite === "1";
  const urlCalendarId = params?.calendarId ?? null;

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  // fromInvite=1 で来ている場合は「リスナー招待フロー」。ライバー用オンボーディングや
  // カレンダー未作成時のリダイレクトとは切り離して扱う。

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const events: { id: string; name: string }[] = [];
    const todayJst = toJstDateString(new Date());
    const weekStartJst = getJstWeekStart(todayJst);
    const weekEndJst = addDays(weekStartJst, 6);
    const seed = getMockSeedEntries(todayJst);
    const rankEntries: RankEntry[] = [];
    let d = weekStartJst;
    while (d <= weekEndJst) {
      const e = seed[d];
      if (e)
        rankEntries.push({
          date: d,
          actual_plus: e.actual_plus ?? null,
          skip_pass_used: e.skip_pass_used ?? false,
        });
      d = addDays(d, 1);
    }
    const totalPlus = rankEntries
      .filter((e) => !e.skip_pass_used)
      .reduce((sum, e) => sum + (e.actual_plus ?? 0), 0);
    const maxPlus: number = 18;
    const { canRankUp: canRankUpNextDay, isKeep: reachedIntermediate } =
      judgeCycleRank(totalPlus);
    const [ry, rm, rd] = weekEndJst.split("-").map((v) => Number.parseInt(v, 10));
    const [ty, tm, td] = todayJst.split("-").map((v) => Number.parseInt(v, 10));
    const resetDateOnly = new Date(ry, rm - 1, rd);
    const todayDateOnly = new Date(ty, tm - 1, td);
    const daysUntilReset = Math.max(
      0,
      Math.ceil((resetDateOnly.getTime() - todayDateOnly.getTime()) / (24 * 60 * 60 * 1000))
    );
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultDate = `${yyyy}-${mm}-${dd}`;
    const weeklyEntries = rankEntries.map((e) => {
      const se = seed[e.date];
      return {
        date: e.date,
        target_plus: se?.target_plus ?? null,
        actual_plus: e.actual_plus,
        skip_pass_used: e.skip_pass_used,
      };
    });
    const hasWeeklySchedule = weeklyEntries.some(
      (e) => e.target_plus != null || e.actual_plus != null || e.skip_pass_used
    );
    const todaySeed = seed[defaultDate];
    const todayEntry = todaySeed
      ? {
          date: defaultDate,
          target_plus: todaySeed.target_plus ?? null,
          actual_plus: todaySeed.actual_plus ?? null,
          skip_pass_used: todaySeed.skip_pass_used ?? false,
          ansuko_baseline: (todaySeed as { ansuko_baseline?: number | null }).ansuko_baseline ?? null,
          border_plus2: todaySeed.border_plus2 ?? null,
          border_plus4: todaySeed.border_plus4 ?? null,
          border_plus6: todaySeed.border_plus6 ?? null,
          event_id: null,
          memo: null,
        }
      : undefined;

    return (
      <div className="space-y-6">
        {DEV_MOCK_BANNER}
        <section>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ダッシュボード
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            ログイン中のライバー用に、カレンダー
            <span className="font-medium">「{calendar.name ?? "メインカレンダー"}」</span>
            を基準にしたサマリをここに表示していきます。
          </p>
        </section>
        <OnboardingCard />
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8 lg:items-start">
          <div className="space-y-6">
            <CurrentRankBadge
              calendarId={calendar.id}
              currentRank="A1"
              canRankUp={canRankUpNextDay}
              daysUntilReset={daysUntilReset}
              onApplyRankUp={noopApplyRankUp}
            />
            {!hasWeeklySchedule && (
              <section
                id="empty-schedule-cta"
                className="rounded-2xl bg-gradient-to-br from-accent-50/90 to-white p-4 text-xs shadow-md dark:from-accent-950/30 dark:to-slate-800"
              >
                <p className="flex items-center gap-1.5 font-medium text-accent-800 dark:text-accent-200">
                  <span className="inline-flex h-4 w-4 items-center justify-center">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <span>今週の配信予定を立ててみよう！</span>
                  <span className="inline-flex h-4 w-4 items-center justify-center text-accent-500">
                    <SparklesIcon className="h-4 w-4" />
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-accent-700 dark:text-accent-300">
                  右のフォームから今日の目標+を登録すると、今の集計周期の+サマリに反映されます。
                </p>
              </section>
            )}
            {hasWeeklySchedule && !todayEntry && (
              <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] shadow-sm dark:bg-amber-500/15 dark:border dark:border-amber-500/30">
                <p className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                  <span className="inline-flex h-4 w-4 items-center justify-center">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <span>今日の記録、まだだね。右のフォームからサクッと登録しよう！</span>
                </p>
              </section>
            )}
            <WeeklyPlusSummary
              totalPlus={totalPlus}
              maxPlus={maxPlus}
              weekStartJst={weekStartJst}
              weekEndJst={weekEndJst}
              canRankUpNextDay={canRankUpNextDay}
              reachedIntermediate={reachedIntermediate}
              daysUntilReset={daysUntilReset}
              weeklyEntries={weeklyEntries}
              todayJst={todayJst}
            />
            <section className="rounded-2xl bg-white p-3 text-[11px] text-zinc-600 shadow-sm dark:bg-slate-800 dark:text-zinc-400">
              <p>
                カレンダー・データタブで他の日も登録・編集できます。設定からイベント追加やリスナー招待ができます。
              </p>
            </section>
          </div>
          <section className="rounded-2xl lg:sticky lg:top-6">
            <HomeScheduleCard
              variant="inline"
              calendarId={calendar.id}
              defaultDate={defaultDate}
              action={noopSaveEntry}
              events={events}
              todayEntry={todayEntry}
            />
          </section>
        </div>
      </div>
    );
  }

  if (!user) redirect("/login");

  const currentCalendar = await getCurrentCalendarForUser(user.id, urlCalendarId);

  // カレンダーがまだ存在しない＝ライバーの初回セットアップ前とみなしてオンボーディングへ。
  // リスナー招待（fromInvite=1）の場合は必ず calendarId 付きで来る想定なので、
  // ここではライバーのみを対象とする。
  if (!currentCalendar && !fromInvite) {
    redirect("/dashboard/onboarding");
  }

  if (!urlCalendarId && currentCalendar) {
    const q = new URLSearchParams({ calendarId: currentCalendar.id });
    if (fromInvite) q.set("fromInvite", "1");
    redirect(`/dashboard?${q.toString()}`);
  }

  const isOwner = await hasOwnedCalendar(user.id);
  // リスナー招待（fromInvite=1）のときは、ライバー用オンボーディングへ飛ばさない。
  if (isOwner && !fromInvite) {
    const profile = await getProfile(user.id);
    if (!profile?.setup_wizard_done) redirect("/dashboard/onboarding");
  }

  let welcomeProfile: { display_name: string | null } | null = null;
  if (fromInvite) {
    welcomeProfile = await getProfile(user.id);
  }

  const [events, rankState] = await Promise.all([
    listEventsForCalendar(currentCalendar.id),
    getOrCreateCalendarRankState(currentCalendar.id),
  ]);

  const todayJst = toJstDateString(new Date());
  const cycleStart = rankState.rank_cycle_start_date;
  const cycleEnd = rankState.rank_reset_date;
  const weekStartJst = cycleStart;
  const weekEndJst = cycleEnd;

  const weeklyEntries = await getScheduleEntriesInRange(
    currentCalendar.id,
    cycleStart,
    cycleEnd
  );

  const rankEntries: RankEntry[] = weeklyEntries.map((e) => ({
    date: e.date,
    actual_plus: e.actual_plus,
    skip_pass_used: e.skip_pass_used,
  }));
  const totalPlus = rankEntries
    .filter((e) => !e.skip_pass_used)
    .reduce((sum, e) => sum + (e.actual_plus ?? 0), 0);
  const { canRankUp: canRankUpNextDay, isKeep: reachedIntermediate } =
    judgeCycleRank(totalPlus);
  const maxPlus: number = 18;
  /** S3 はランクアップなし（維持 or 降格のみ）なので、ボタンと文言はランクアップにしない */
  const canRankUp = canRankUpNextDay && getNextRank(rankState.current_rank) != null;

  const [ry, rm, rd] = cycleEnd.split("-").map((v) => Number.parseInt(v, 10));
  const [ty, tm, td] = todayJst.split("-").map((v) => Number.parseInt(v, 10));
  const resetDateOnly = new Date(ry, rm - 1, rd);
  const todayDateOnly = new Date(ty, tm - 1, td);
  const daysUntilReset = Math.max(
    0,
    Math.ceil((resetDateOnly.getTime() - todayDateOnly.getTime()) / (24 * 60 * 60 * 1000))
  );

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const hasWeeklySchedule = weeklyEntries.length > 0;
  const todayEntry = weeklyEntries.find((e) => e.date === defaultDate);

  return (
    <div className="space-y-6">
      {fromInvite && (
        <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />}>
          <ListenerWelcome
            calendarId={currentCalendar.id}
            calendarName={currentCalendar.name}
            displayName={welcomeProfile?.display_name ?? null}
          />
        </Suspense>
      )}
      <section>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ダッシュボード
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          ログイン中のライバー用に、カレンダー
          <span className="font-medium">「{currentCalendar.name ?? "メインカレンダー"}」</span>
          を基準にしたサマリをここに表示していきます。
        </p>
      </section>

      <OnboardingCard />

      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8 lg:items-start">
        <div className="space-y-6">
          <CurrentRankBadge
            calendarId={currentCalendar.id}
            currentRank={rankState.current_rank}
            canRankUp={canRankUp}
            daysUntilReset={daysUntilReset}
            onApplyRankUp={applyRankUp}
          />
          {!hasWeeklySchedule && (
            <section
              id="empty-schedule-cta"
              className="rounded-2xl bg-gradient-to-br from-accent-50/90 to-white p-4 text-xs shadow-md dark:from-accent-950/30 dark:to-slate-800"
            >
              <p className="flex items-center gap-1.5 font-medium text-accent-800 dark:text-accent-200">
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <span>今週の配信予定を立ててみよう！</span>
                <span className="inline-flex h-4 w-4 items-center justify-center text-accent-500">
                  <SparklesIcon className="h-4 w-4" />
                </span>
              </p>
              <p className="mt-1 text-[11px] text-accent-700 dark:text-accent-300">
                右のフォームから今日の目標+を登録すると、今週の+サマリに反映されます。
              </p>
            </section>
          )}

          {hasWeeklySchedule && !todayEntry && (
            <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] shadow-sm dark:bg-amber-500/15 dark:border dark:border-amber-500/30">
              <p className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <span>今日の記録、まだだね。右のフォームからサクッと登録しよう！</span>
              </p>
            </section>
          )}

          <WeeklyPlusSummary
            totalPlus={totalPlus}
            maxPlus={maxPlus}
            weekStartJst={weekStartJst}
            weekEndJst={weekEndJst}
            canRankUpNextDay={canRankUpNextDay}
            currentRank={rankState.current_rank}
            reachedIntermediate={reachedIntermediate}
            daysUntilReset={daysUntilReset}
            weeklyEntries={weeklyEntries}
            todayJst={todayJst}
          />

          <section className="rounded-2xl bg-white p-3 text-[11px] text-zinc-600 shadow-sm dark:bg-slate-800 dark:text-zinc-400">
            <p>
              カレンダー・データタブで他の日も登録・編集できます。設定からイベント追加やリスナー招待ができます。
            </p>
          </section>
        </div>

        <section className="rounded-2xl lg:sticky lg:top-6">
          <HomeScheduleCard
            variant="inline"
            calendarId={currentCalendar.id}
            defaultDate={defaultDate}
            action={saveScheduleEntry}
            events={events}
            todayEntry={todayEntry}
          />
        </section>
      </div>
    </div>
  );
}

