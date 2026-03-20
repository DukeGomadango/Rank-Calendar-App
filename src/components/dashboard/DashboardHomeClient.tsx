"use client";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { CurrentRankBadge } from "@/components/dashboard/CurrentRankBadge";
import { WeeklyPlusSummary } from "@/components/dashboard/WeeklyPlusSummary";
import { HomeScheduleCard } from "@/components/schedule/HomeScheduleCard";
import { CalendarIcon, SparklesIcon } from "@/components/icons/DashboardIcons";
import { judgeCycleRank, getNextRank, type RankEntry, type RankLabel } from "@/lib/domain/rank";

type Props = {
  saveScheduleEntry: (formData: FormData) => Promise<void> | Promise<unknown>;
  applyRankUp: (calendarId: string) => Promise<void>;
};

export function DashboardHomeClient({ saveScheduleEntry, applyRankUp }: Props) {
  const {
    calendarId,
    rangeData,
    todayJst,
  } = useDashboardCalendar();

  const rankState = rangeData?.rankState;
  const entries = rangeData?.entries ?? [];
  const events = (rangeData?.events ?? []) as { id: string; name: string }[];

  if (!rankState) {
    return null;
  }

  const cycleStart = rankState.rank_cycle_start_date;
  const cycleEnd = rankState.rank_reset_date;

  const weeklyEntries = entries.filter(
    (e) => e.date >= cycleStart && e.date <= cycleEnd,
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
  const canRankUp =
    canRankUpNextDay &&
    getNextRank(rankState.current_rank as RankLabel | null) != null;

  const [ry, rm, rd] = cycleEnd.split("-").map((v) => Number.parseInt(v, 10));
  const [ty, tm, td] = todayJst.split("-").map((v) => Number.parseInt(v, 10));
  const resetDateOnly = new Date(ry, rm - 1, rd);
  const todayDateOnly = new Date(ty, tm - 1, td);
  const daysUntilReset = Math.max(
    0,
    Math.ceil(
      (resetDateOnly.getTime() - todayDateOnly.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  const defaultDate = todayJst;
  const hasWeeklySchedule = weeklyEntries.length > 0;
  const todayEntry = weeklyEntries.find((e) => e.date === defaultDate);

  const weekStartJst = cycleStart;
  const weekEndJst = cycleEnd;

  return (
    <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8 lg:items-start">
      <div className="space-y-6">
        <CurrentRankBadge
          calendarId={calendarId}
          currentRank={rankState.current_rank as RankLabel | null}
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
          currentRank={rankState.current_rank as RankLabel | null}
          reachedIntermediate={reachedIntermediate}
          daysUntilReset={daysUntilReset}
          weeklyEntries={rankEntries}
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
          calendarId={calendarId}
          defaultDate={defaultDate}
          action={saveScheduleEntry}
          events={events}
          todayEntry={todayEntry}
        />
      </section>
    </div>
  );
}

