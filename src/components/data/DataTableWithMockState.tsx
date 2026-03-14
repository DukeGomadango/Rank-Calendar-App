"use client";

import { useMemo } from "react";
import { DataTable } from "./DataTable";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { useMockSchedule } from "@/lib/mock-schedule-context";

export type DataTableRow = {
  date: string;
  weekday: string;
  id?: string;
  border_plus2?: number | null;
  border_plus4?: number | null;
  border_plus6?: number | null;
  target_plus?: number | null;
  actual_plus?: number | null;
  skip_pass_used?: boolean;
};

type Props = {
  initialRows: DataTableRow[];
  permissions: CalendarPermissionFlags;
  calendarId: string;
};

/**
 * 開発用モック用。MockScheduleContext と同期し、データタブ⇔カレンダーで同じデータを表示する。
 */
export function DataTableWithMockState({
  initialRows,
  permissions,
  calendarId,
}: Props) {
  const ctx = useMockSchedule();
  const rows = useMemo(() => {
    if (!ctx) return initialRows;
    return initialRows.map((r) => ({ ...r, ...ctx.entriesByDate[r.date] }));
  }, [initialRows, ctx?.entriesByDate]);

  const onUpdateField = ctx
    ? async (
        _cal: string,
        date: string,
        field: string,
        value: string | number | boolean
      ) => {
        ctx.updateField(date, field, value);
      }
    : async () => {};

  return (
    <DataTable
      data={rows}
      permissions={permissions}
      calendarId={calendarId}
      onUpdateField={onUpdateField}
    />
  );
}
