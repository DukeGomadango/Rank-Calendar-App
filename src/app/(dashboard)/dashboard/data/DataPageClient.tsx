"use client";

import dayjs from "dayjs";
import { useEffect, useMemo } from "react";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { EnsureCalendarIdInUrl } from "@/components/dashboard/EnsureCalendarIdInUrl";
import { DataTable } from "@/components/data/DataTable";
import { DataRangeSelect } from "@/components/data/DataRangeSelect";
import { addDays, toJstDateString } from "@/lib/domain/calendar";
import {
  buildDisplayRankCycles,
  simulateRankCyclesForward,
  createGetEntryForForecast,
} from "@/lib/domain/rank-simulation";
import { calculateCycleCumulativeByDate } from "@/lib/domain/rank";
import { getPredictedSkipPassRemaining } from "@/lib/domain/skip-pass-prediction";
import type { EventRow } from "@/lib/data/events";

type UpdateFieldAction = (
  calendarId: string,
  date: string,
  field: string,
  value: string | number | boolean,
) => Promise<void>;

type UpdateSkipPassSnapshotAction = (
  calendarId: string,
  asOfDate: string,
  value: number,
) => Promise<void>;

type Props = {
  daysRange: number;
  onUpdateField: UpdateFieldAction;
  onUpdateSkipPassSnapshot?: UpdateSkipPassSnapshotAction;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function DataPageClient({
  daysRange,
  onUpdateField,
  onUpdateSkipPassSnapshot,
}: Props) {
  const { calendarId, calendarName, permissions, rangeData } =
    useDashboardCalendar();

  const todayStr = toJstDateString(new Date());

  const { rows, events } = useMemo(() => {
    const fromStr = dayjs(todayStr)
      .add(-daysRange, "day")
      .format("YYYY-MM-DD");
    const toStr = dayjs(todayStr).add(daysRange, "day").format("YYYY-MM-DD");
    const entries = rangeData?.entries ?? [];
    const rankState = rangeData?.rankState ?? null;
    const rankCycleHistory = rangeData?.rankCycleHistory ?? [];
    const events = (rangeData?.events ?? []) as EventRow[];
    const skipPassSnapshots = (rangeData?.skipPassSnapshots ?? []) as {
      as_of_date: string;
      remaining: number;
    }[];
    const skipPassSnapshotsSorted = skipPassSnapshots
      .slice()
      .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
    const skipPassSnapshotByDate = new Map(
      skipPassSnapshotsSorted.map((s) => [s.as_of_date, s.remaining] as const),
    );
    let skipPassSnapshotIdx = 0;
    let latestSkipPassRemaining: number | null = null;
    const baseRemaining: number | null =
      rankState?.skip_pass_remaining ?? null;

    const entriesByDate = new Map(entries.map((e) => [e.date, e]));

    type RankCycle = { start: string; end: string; rank: string | null };
    let rankCycles: RankCycle[] = [];

    if (permissions.canViewRank && rankState) {
      const entriesByDateForForecast = new Map(
        entries.map((e) => [e.date, e] as const),
      );
      const { displayCycles } = buildDisplayRankCycles({
        history: rankCycleHistory,
        rankState,
        entriesByDate: entriesByDateForForecast,
        todayJst: todayStr,
        simulateToDate: toStr,
      });
      rankCycles = displayCycles.map((c) => ({
        start: c.start,
        end: c.end,
        rank: c.rank,
      }));

      const lastCycle = displayCycles[displayCycles.length - 1];
      if (lastCycle && lastCycle.end < toStr) {
        const skipPredictionEnd = addDays(rankState.rank_reset_date, 120);
        const getEntryForForecast = createGetEntryForForecast(
          entriesByDateForForecast,
          todayStr,
          rankState.skip_pass_remaining ?? 0,
          skipPredictionEnd,
        );
        const lastRank = lastCycle.rank;
        const extra = simulateRankCyclesForward({
          cycleStart: addDays(lastCycle.end, 1),
          initialRank: lastRank,
          entriesByDate: entriesByDateForForecast,
          getEntryForForecast,
          todayJst: todayStr,
          simulateToDate: toStr,
        });
        rankCycles.push(
          ...extra.map((c) => ({ start: c.start, end: c.end, rank: c.rank })),
        );
      }
    }
    const rankByDate = new Map<string, string | null>();
    const rankCycleMetaByDate = new Map<
      string,
      {
        dayIndex: number;
        totalDays: number;
        isCycleStart: boolean;
        isCycleEnd: boolean;
      }
    >();
    for (const c of rankCycles) {
      const totalDays =
        dayjs(c.end, "YYYY-MM-DD").diff(dayjs(c.start, "YYYY-MM-DD"), "day") + 1;
      let dayIndex = 1;
      let d = c.start;
      while (d <= c.end) {
        if (!rankByDate.has(d)) {
          rankByDate.set(d, c.rank);
        }
        if (!rankCycleMetaByDate.has(d)) {
          rankCycleMetaByDate.set(d, {
            dayIndex,
            totalDays,
            isCycleStart: d === c.start,
            isCycleEnd: d === c.end,
          });
        }
        dayIndex += 1;
        d = dayjs(d, "YYYY-MM-DD").add(1, "day").format("YYYY-MM-DD");
      }
    }
    const remainingAsOfToday = (() => {
      let latest: number | null = null;
      for (const s of skipPassSnapshotsSorted) {
        if (s.as_of_date <= todayStr) latest = s.remaining;
      }
      return latest ?? baseRemaining;
    })();
    const rankEntriesForCumulative = entries.map((e) => ({
      date: e.date,
      actual_plus:
        e.date >= todayStr ? (e.target_plus ?? e.actual_plus) : e.actual_plus,
      skip_pass_used: e.skip_pass_used,
    }));
    const cumulativeByDate: Record<string, number> = {};
    if (permissions.canViewRank) {
      for (const c of rankCycles) {
        const partial = calculateCycleCumulativeByDate(
          rankEntriesForCumulative,
          c.start,
          c.end,
        );
        Object.assign(cumulativeByDate, partial);
      }
    }

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
      rank_cycle_boundary?: "start" | "end" | null;
      rank_score_cumulative?: number | null;
      skip_pass_remaining_as_of?: number | null;
      memo?: string | null;
      event_id?: string | null;
    }[] = [];

    let cursor = dayjs(fromStr, "YYYY-MM-DD");
    const end = dayjs(toStr, "YYYY-MM-DD");
    while (cursor.isSame(end) || cursor.isBefore(end)) {
      const dateStr = cursor.format("YYYY-MM-DD");
      const weekday = WEEKDAYS[cursor.day()] ?? "";
      const entry = entriesByDate.get(dateStr);

      const rankForDay = rankByDate.get(dateStr) ?? null;
      const cycleMeta = rankCycleMetaByDate.get(dateStr);

      // 「その日の時点」の残り枚数は、該当日以前の最新スナップショットを採用する。
      // スナップショットが無い場合は calendar_rank_state の初期値にフォールバック。
      while (
        skipPassSnapshotIdx < skipPassSnapshotsSorted.length &&
        skipPassSnapshotsSorted[skipPassSnapshotIdx].as_of_date <= dateStr
      ) {
        latestSkipPassRemaining =
          skipPassSnapshotsSorted[skipPassSnapshotIdx].remaining;
        skipPassSnapshotIdx++;
      }

      rows.push({
        date: dateStr,
        weekday,
        ...(entry ?? {}),
        current_rank:
          permissions.canViewRank
            ? (rankForDay ?? rankState?.current_rank ?? null)
            : undefined,
        rank_cycle_boundary:
          permissions.canViewRank && cycleMeta
            ? cycleMeta.isCycleStart
              ? "start"
              : cycleMeta.isCycleEnd
                ? "end"
                : null
            : undefined,
        rank_score_cumulative:
          permissions.canViewRank && rankState
            ? (cumulativeByDate[dateStr] ?? null)
            : undefined,
        skip_pass_remaining_as_of:
          dateStr > todayStr &&
          !skipPassSnapshotByDate.has(dateStr) &&
          remainingAsOfToday != null
            ? getPredictedSkipPassRemaining(
                remainingAsOfToday,
                addDays(todayStr, 1),
                dateStr,
                entriesByDate,
                todayStr,
              )
            : (latestSkipPassRemaining ?? baseRemaining),
      });

      cursor = cursor.add(1, "day");
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[perf] data_page_rows_compute", {
        rows: rows.length,
        entries: entries.length,
      });
    }
    return { rows, events };
  }, [
    daysRange,
    permissions,
    rangeData,
    todayStr,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[perf] data_page_render", {
        rows: rows.length,
        events: events.length,
        calendarId,
      });
    }
  }, [calendarId, events.length, rows.length]);

  if (!permissions.canViewTable) {
    return (
      <div className="min-w-0 space-y-4">
        <EnsureCalendarIdInUrl />
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

  const hasAnyEntries = (rangeData?.entries ?? []).length > 0;

  return (
    <div className="min-w-0 space-y-4">
      <EnsureCalendarIdInUrl />
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            データ
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {calendarName ?? "メインカレンダー"} の今日を中心に前後 {daysRange}
            日分のスケジュールを一覧表示します。
          </p>
        </div>
        <DataRangeSelect currentDays={daysRange} />
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
        calendarId={calendarId}
        onUpdateField={onUpdateField}
        events={events}
        onUpdateSkipPassSnapshot={onUpdateSkipPassSnapshot}
      />
    </div>
  );
}

