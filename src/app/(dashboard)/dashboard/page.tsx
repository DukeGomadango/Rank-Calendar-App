import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar } from "@/lib/data/events";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { toJstDateString, getJstWeekStart } from "@/lib/domain/calendar";
import { judgeWeeklyRank, type RankEntry } from "@/lib/domain/rank";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { WeeklyPlusSummary } from "@/components/dashboard/WeeklyPlusSummary";
import { HomeScheduleCard } from "@/components/schedule/HomeScheduleCard";
import { saveScheduleEntry, noopSaveEntry } from "./actions";

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
    const [y, m, d] = weekStartJst.split("-").map((v) => Number.parseInt(v, 10));
    const startDate = new Date(y, m - 1, d);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const weekEndJst = toJstDateString(endDate);
    const rankEntries: RankEntry[] = [];
    const judgements = judgeWeeklyRank(rankEntries);
    const thisWeek = judgements.find((j) => j.weekStart === weekStartJst);
    const totalPlus = thisWeek?.totalPlus ?? 0;
    const maxPlus: number = 18;
    const progressRatio = Math.max(0, Math.min(1, maxPlus === 0 ? 0 : totalPlus / maxPlus));
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultDate = `${yyyy}-${mm}-${dd}`;
    const hasWeeklySchedule = false;
    const todayEntry = undefined;

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
            <WeeklyPlusSummary
              totalPlus={totalPlus}
              maxPlus={maxPlus}
              weekStartJst={weekStartJst}
              weekEndJst={weekEndJst}
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
              todayEntry={undefined}
            />
          </section>
        </div>
      </div>
    );
  }

  if (!user) redirect("/login");
  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const events = await listEventsForCalendar(calendar.id);

  // JST 基準で今週（月〜日）の範囲を計算
  const todayJst = toJstDateString(new Date());
  const weekStartJst = getJstWeekStart(todayJst);
  const [y, m, d] = weekStartJst.split("-").map((v) => Number.parseInt(v, 10));
  const startDate = new Date(y, m - 1, d);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const weekEndJst = toJstDateString(endDate);

  const weeklyEntries = await getScheduleEntriesInRange(
    calendar.id,
    weekStartJst,
    weekEndJst
  );

  const rankEntries: RankEntry[] = weeklyEntries.map((e) => ({
    date: e.date,
    actual_plus: e.actual_plus,
    skip_pass_used: e.skip_pass_used,
  }));
  const judgements = judgeWeeklyRank(rankEntries);
  const thisWeek = judgements.find((j) => j.weekStart === weekStartJst);
  const totalPlus = thisWeek?.totalPlus ?? 0;
  const maxPlus: number = 18;

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
            canRankUpNextDay={thisWeek?.canRankUpNextDay}
            reachedIntermediate={thisWeek?.reachedIntermediate}
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

