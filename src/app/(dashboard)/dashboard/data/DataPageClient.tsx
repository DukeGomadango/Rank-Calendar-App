"use client";

import dayjs from "dayjs";
import { useEffect, useMemo } from "react";

import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { EnsureCalendarIdInUrl } from "@/components/dashboard/EnsureCalendarIdInUrl";
import { DataTable } from "@/components/data/DataTable";
import { DataRangeSelect } from "@/components/data/DataRangeSelect";
import { toJstDateString } from "@/lib/domain/calendar";
import { calculateCycleCumulativeByDate } from "@/lib/domain/rank";
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
  const { calendarId, calendarName, permissions, rangeData, futureCycles } =
    useDashboardCalendar();

  const todayStr = toJstDateString(new Date());
  const fromStr = dayjs(todayStr)
    .add(-daysRange, "day")
    .format("YYYY-MM-DD");
  const toStr = dayjs(todayStr).add(daysRange, "day").format("YYYY-MM-DD");

  const { rows, events } = useMemo(() => {
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
    let skipPassSnapshotIdx = 0;
    let latestSkipPassRemaining: number | null = null;
    const baseRemaining: number | null =
      rankState?.skip_pass_remaining ?? null;

    const entriesByDate = new Map(entries.map((e) => [e.date, e]));

    type RankCycle = { start: string; end: string; rank: string | null };
    const rankCycles: RankCycle[] = [];

    for (const h of rankCycleHistory) {
      rankCycles.push({
        start: h.cycle_start_date,
        end: h.cycle_end_date,
        rank: h.rank_during,
      });
    }
    if (rankState) {
      rankCycles.push({
        start: rankState.rank_cycle_start_date,
        end: rankState.rank_reset_date,
        rank: rankState.current_rank,
      });
    }
    for (const fc of futureCycles ?? []) {
      rankCycles.push({ start: fc.start, end: fc.end, rank: fc.rank });
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

    const cumulativeByDate =
      rankState && permissions.canViewRank
        ? calculateCycleCumulativeByDate(
            entries.map((e) => ({
              date: e.date,
              actual_plus:
                e.date >= todayStr
                  ? (e.target_plus ?? e.actual_plus)
                  : e.actual_plus,
              skip_pass_used: e.skip_pass_used,
            })),
            rankState.rank_cycle_start_date,
            rankState.rank_reset_date,
          )
        : ({} as Record<string, number>);

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
        skip_pass_remaining_as_of: latestSkipPassRemaining ?? baseRemaining,
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
    fromStr,
    futureCycles,
    permissions.canViewRank,
    rangeData,
    toStr,
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

