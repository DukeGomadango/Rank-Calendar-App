import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar } from "@/lib/data/events";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { getOrCreateCalendarRankState } from "@/lib/data/calendar-rank-state";
import { toJstDateString, getJstWeekStart, addDays } from "@/lib/domain/calendar";
import { judgeCycleRank, type RankEntry } from "@/lib/domain/rank";
import { getMockSeedEntries } from "@/lib/mock-seed-data";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { CurrentRankBadge } from "@/components/dashboard/CurrentRankBadge";
import { WeeklyPlusSummary } from "@/components/dashboard/WeeklyPlusSummary";
import { HomeScheduleCard } from "@/components/schedule/HomeScheduleCard";
import {
  saveScheduleEntry,
  noopSaveEntry,
  applyRankUp,
  noopApplyRankUp,
} from "./actions";

const DEV_MOCK_BANNER = (
  <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] text-amber-800 shadow-sm dark:bg-orange-500/20 dark:text-orange-400">
    <p>開発用モック表示です。データは保存されません。</p>
  </section>
);

export default async function DashboardHomePage() {
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
                <p className="font-medium text-accent-800 dark:text-accent-200">
                  📅 今週の配信予定を立ててみよう！✨
                </p>
                <p className="mt-1 text-[11px] text-accent-700 dark:text-accent-300">
                  右のフォームから今日の目標+を登録すると、今の集計周期の+サマリに反映されます。
                </p>
              </section>
            )}
            {hasWeeklySchedule && !todayEntry && (
              <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] shadow-sm dark:bg-amber-500/15 dark:border dark:border-amber-500/30">
                <p className="text-amber-800 dark:text-amber-200">
                  📅 今日の記録、まだだね。右のフォームからサクッと登録しよう！
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
  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const events = await listEventsForCalendar(calendar.id);

  const todayJst = toJstDateString(new Date());
  const rankState = await getOrCreateCalendarRankState(calendar.id);
  const cycleStart = rankState.rank_cycle_start_date;
  const cycleEnd = rankState.rank_reset_date;
  const weekStartJst = cycleStart;
  const weekEndJst = cycleEnd;

  const weeklyEntries = await getScheduleEntriesInRange(
    calendar.id,
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
            currentRank={rankState.current_rank}
            canRankUp={canRankUpNextDay}
            daysUntilReset={daysUntilReset}
            onApplyRankUp={applyRankUp}
          />
          {!hasWeeklySchedule && (
            <section
              id="empty-schedule-cta"
              className="rounded-2xl bg-gradient-to-br from-accent-50/90 to-white p-4 text-xs shadow-md dark:from-accent-950/30 dark:to-slate-800"
            >
              <p className="font-medium text-accent-800 dark:text-accent-200">
                📅 今週の配信予定を立ててみよう！✨
              </p>
              <p className="mt-1 text-[11px] text-accent-700 dark:text-accent-300">
                右のフォームから今日の目標+を登録すると、今週の+サマリに反映されます。
              </p>
            </section>
          )}

          {hasWeeklySchedule && !todayEntry && (
            <section className="rounded-2xl bg-amber-50/90 p-3 text-[11px] shadow-sm dark:bg-amber-500/15 dark:border dark:border-amber-500/30">
              <p className="text-amber-800 dark:text-amber-200">
                📅 今日の記録、まだだね。右のフォームからサクッと登録しよう！
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
            action={saveScheduleEntry}
            events={events}
            todayEntry={todayEntry}
          />
        </section>
      </div>
    </div>
  );
}

