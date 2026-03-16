import dayjs from "dayjs";
import "dayjs/locale/ja";
import { Suspense } from "react";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { getOrCreateCalendarRankState, ensureSkipPassIncrementForLastWeek, getSkipPassSnapshotsBefore, type SkipPassSnapshotRow } from "@/lib/data/calendar-rank-state";
import { listEventsForCalendar } from "@/lib/data/events";
import { calculateCycleCumulativeByDate } from "@/lib/domain/rank";
import { compareJstDate, getJstWeekStart, addDays, toJstDateString } from "@/lib/domain/calendar";
import { getPredictedSkipPassRemaining, type EntryForPrediction } from "@/lib/domain/skip-pass-prediction";
import { getMockSeedEntries } from "@/lib/mock-seed-data";
import {
  getCalendarPermissionsForUser,
  getMockPermissions,
} from "@/lib/auth/permission";
import { DataTable } from "@/components/data/DataTable";
import { DataTableWithMockState } from "@/components/data/DataTableWithMockState";
import { DataRangeSelect } from "@/components/data/DataRangeSelect";
import { parseDaysParam } from "@/lib/data-range";
import { updateScheduleEntryField, updateSkipPassSnapshot } from "../actions";

dayjs.locale("ja");

type PageProps = { searchParams?: Promise<{ days?: string }> | { days?: string } };

export default async function DataPage(props: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  const rawSp = props.searchParams;
  const resolvedSp: { days?: string } =
    rawSp && typeof (rawSp as Promise<unknown>).then === "function"
      ? await (rawSp as Promise<{ days?: string }>)
      : (rawSp ?? {}) as { days?: string };
  const daysRange = parseDaysParam(resolvedSp.days);

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const permissions = await getMockPermissions();
    const todayJst = toJstDateString(new Date());
    const today = dayjs(todayJst);
    const cycleStart = getJstWeekStart(todayJst);
    const cycleEnd = addDays(cycleStart, 6);
    const seed = getMockSeedEntries(todayJst);
    const rankEntriesForCumulative = [];
    let cursorCycle = cycleStart;
    while (cursorCycle <= cycleEnd) {
      const e = seed[cursorCycle];
      rankEntriesForCumulative.push({
        date: cursorCycle,
        actual_plus: e?.actual_plus ?? null,
        skip_pass_used: e?.skip_pass_used ?? false,
      });
      cursorCycle = addDays(cursorCycle, 1);
    }
    const cumulativeByDate = calculateCycleCumulativeByDate(
      rankEntriesForCumulative,
      cycleStart,
      cycleEnd
    );
    const from = today.subtract(daysRange, "day").format("YYYY-MM-DD");
    const to = today.add(daysRange, "day").format("YYYY-MM-DD");
    const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
    const rows: {
      date: string;
      weekday: string;
      id?: string;
      border_plus2?: number | null;
      border_plus4?: number | null;
      border_plus6?: number | null;
      target_plus?: number | null;
      actual_plus?: number | null;
      skip_pass_used?: boolean;
      current_rank?: string | null;
      rank_score_cumulative?: number | null;
      memo?: string | null;
    }[] = [];
    let cursor = dayjs(from);
    const end = dayjs(to);
    while (cursor.isSame(end) || cursor.isBefore(end)) {
      const dateStr = cursor.format("YYYY-MM-DD");
      const inCycle = dateStr >= cycleStart && dateStr <= cycleEnd;
      const entry = seed[dateStr];
      rows.push({
        date: dateStr,
        weekday: WEEKDAYS[cursor.day()],
        target_plus: entry?.target_plus ?? null,
        actual_plus: entry?.actual_plus ?? null,
        skip_pass_used: entry?.skip_pass_used ?? false,
        current_rank: "A1",
        rank_score_cumulative: inCycle ? (cumulativeByDate[dateStr] ?? null) : null,
        memo: entry?.memo ?? null,
      });
      cursor = cursor.add(1, "day");
    }
    const hasAnyEntries = rows.some(
      (r) =>
        r.target_plus != null ||
        r.actual_plus != null ||
        (r.skip_pass_used ?? false)
    );
    return (
      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。セルを編集すると画面上にだけ反映されます。</p>
        </section>
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              データ
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {calendar.name ?? "メインカレンダー"} の今日を中心に前後 {daysRange}
              日分のスケジュールを一覧表示します。
            </p>
          </div>
          <Suspense fallback={null}>
            <DataRangeSelect currentDays={daysRange} />
          </Suspense>
        </header>
        {!hasAnyEntries && (
          <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
            <p>
              この期間にはまだスケジュールがありません。ホームやカレンダーから登録しましょう。
            </p>
          </section>
        )}
        <DataTableWithMockState
          initialRows={rows}
          permissions={permissions}
          calendarId={calendar.id}
          events={[]}
        />
      </div>
    );
  }

  if (!user) redirect("/login");
  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const permissions = await getCalendarPermissionsForUser(calendar.id, user.id);

  if (!permissions.canViewTable) {
    return (
      <div className="min-w-0 space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            データ
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            このカレンダーのデータテーブルを閲覧する権限がありません。オーナーに権限の付与を依頼してください。
          </p>
        </header>
      </div>
    );
  }

  const today = dayjs();
  const from = today.subtract(daysRange, "day").format("YYYY-MM-DD");
  const to = today.add(daysRange, "day").format("YYYY-MM-DD");

  const [entries, events, rankState] = await Promise.all([
    getScheduleEntriesInRange(calendar.id, from, to),
    listEventsForCalendar(calendar.id),
    getOrCreateCalendarRankState(calendar.id),
  ]);
  const entriesByDate = new Map(entries.map((e) => [e.date, e]));

  await ensureSkipPassIncrementForLastWeek(calendar.id);
  const cycleStart = rankState.rank_cycle_start_date;
  const cycleEnd = rankState.rank_reset_date;

  const snapshots = await getSkipPassSnapshotsBefore(calendar.id, to);
  const todayStr = today.format("YYYY-MM-DD");
  const getRemainingAsOf = (dateStr: string): number | null => {
    const s = snapshots.find((x: SkipPassSnapshotRow) => x.as_of_date <= dateStr);
    return s?.remaining ?? null;
  };
  const baseRemaining =
    getRemainingAsOf(todayStr) ?? rankState.skip_pass_remaining ?? 0;
  const predictionEntriesMap = new Map<string, EntryForPrediction>(
    entries.map((e) => [
      e.date,
      {
        target_plus: e.target_plus,
        actual_plus: e.actual_plus,
        skip_pass_used: e.skip_pass_used,
      },
    ])
  );

  const rankEntries = entries.map((e) => ({
    date: e.date,
    actual_plus: e.actual_plus,
    skip_pass_used: e.skip_pass_used,
  }));
  const cumulativeByDate = calculateCycleCumulativeByDate(
    rankEntries,
    cycleStart,
    cycleEnd
  );

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  const rows: {
    date: string;
    weekday: string;
    id?: string;
    ansuko_baseline?: number | null;
    border_plus2?: number | null;
    border_plus4?: number | null;
    border_plus6?: number | null;
    target_plus?: number | null;
    actual_plus?: number | null;
    skip_pass_used?: boolean;
    current_rank?: string | null;
    rank_score_cumulative?: number | null;
    skip_pass_remaining_as_of?: number | null;
  }[] = [];

  let cursor = dayjs(from);
  const end = dayjs(to);
  while (cursor.isSame(end) || cursor.isBefore(end)) {
    const dateStr = cursor.format("YYYY-MM-DD");
    const weekday = WEEKDAYS[cursor.day()];
    const entry = entriesByDate.get(dateStr);
    const inCycle =
      compareJstDate(dateStr, cycleStart) >= 0 &&
      compareJstDate(dateStr, cycleEnd) <= 0;
    const skipPassValue =
      dateStr > todayStr
        ? getPredictedSkipPassRemaining(
            baseRemaining,
            addDays(todayStr, 1),
            dateStr,
            predictionEntriesMap,
            todayStr
          )
        : getRemainingAsOf(dateStr);
    rows.push({
      date: dateStr,
      weekday,
      ...(entry ?? {}),
      current_rank: rankState.current_rank ?? null,
      rank_score_cumulative: inCycle ? (cumulativeByDate[dateStr] ?? null) : null,
      skip_pass_remaining_as_of: skipPassValue ?? undefined,
    });
    cursor = cursor.add(1, "day");
  }

  const hasAnyEntries = entries.length > 0;

  return (
    <div className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            データ
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {calendar.name ?? "メインカレンダー"} の今日を中心に前後 {daysRange}
            日分のスケジュールを一覧表示します。
          </p>
        </div>
        <Suspense fallback={null}>
          <DataRangeSelect currentDays={daysRange} />
        </Suspense>
      </header>
      {!hasAnyEntries && (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          <p>
            この期間にはまだスケジュールがありません。ホームやカレンダーから登録しましょう。
          </p>
        </section>
      )}
      <DataTable
        data={rows}
        permissions={permissions}
        calendarId={calendar.id}
        onUpdateField={updateScheduleEntryField}
        events={events}
        onUpdateSkipPassSnapshot={updateSkipPassSnapshot}
      />
    </div>
  );
}

