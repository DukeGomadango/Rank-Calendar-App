"use client";

import dayjs from "dayjs";
import { useMemo } from "react";

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

    const cumulativeByDate =
      rankState && permissions.canViewRank
        ? calculateCycleCumulativeByDate(
            entries.map((e) => ({
              date: e.date,
              actual_plus: e.actual_plus,
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

      const cycleForDay =
        rankCycles.find((c) => dateStr >= c.start && dateStr <= c.end) ?? null;

      rows.push({
        date: dateStr,
        weekday,
        ...(entry ?? {}),
        current_rank:
          permissions.canViewRank
            ? (cycleForDay?.rank ?? rankState?.current_rank ?? null)
            : undefined,
        rank_score_cumulative:
          permissions.canViewRank && rankState
            ? (cumulativeByDate[dateStr] ?? null)
            : undefined,
        skip_pass_remaining_as_of: undefined,
      });

      cursor = cursor.add(1, "day");
    }

    return { rows, events };
  }, [
    fromStr,
    futureCycles,
    permissions.canViewRank,
    rangeData,
    toStr,
  ]);

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

