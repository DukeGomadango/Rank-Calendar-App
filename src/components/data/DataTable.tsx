'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { useTransition } from "react";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { PLUS_SELECT_VALUES, normalizePlusValue } from "@/lib/plus-options";
import { useViewMode } from "@/lib/view-mode-context";

/** 日付・曜日は必ずあり、他は登録があれば入る */
type Row = {
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

type UpdateFieldAction = (
  calendarId: string,
  date: string,
  field: string,
  value: string | number | boolean
) => Promise<void>;

type Props = {
  data: Row[];
  permissions: CalendarPermissionFlags;
  calendarId: string;
  onUpdateField: UpdateFieldAction;
};

const inputClass =
  "w-full min-w-[2.5rem] rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] text-zinc-900 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";
const selectClass =
  "w-full min-w-[2.5rem] rounded border border-zinc-300 bg-white px-1 py-0.5 text-[11px] text-zinc-900 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

export function DataTable({ data, permissions, calendarId, onUpdateField }: Props) {
  const [isPending, startTransition] = useTransition();
  const { viewMode } = useViewMode();
  const hideBordersInSimple = !permissions.isOwner && viewMode === "simple";
  const canEdit = permissions.canEditSchedule;

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "date",
      header: "日付",
      cell: ({ row }) => dayjs(row.original.date).format("YYYY-MM-DD"),
    },
    {
      accessorKey: "weekday",
      header: "曜",
    },
    {
      accessorKey: "target_plus",
      header: "目標+",
      cell: ({ row, getValue }) => {
        if (!permissions.canViewTargetActual) return "";
        const v = getValue<number | null | undefined>();
        const displayVal = normalizePlusValue(v);
        if (canEdit) {
          return (
            <select
              defaultValue={displayVal}
              onChange={(e) => {
                const next = Number(e.target.value);
                startTransition(() =>
                  onUpdateField(calendarId, row.original.date, "target_plus", next)
                );
              }}
              className={selectClass}
              disabled={isPending}
            >
              {PLUS_SELECT_VALUES.map((n) => (
                <option key={n} value={n}>
                  +{n}
                </option>
              ))}
            </select>
          );
        }
        return `+${displayVal}`;
      },
    },
    {
      accessorKey: "actual_plus",
      header: "実績+",
      cell: ({ row, getValue }) => {
        if (!permissions.canViewTargetActual) return "";
        const v = getValue<number | null | undefined>();
        const displayVal = normalizePlusValue(v);
        if (canEdit) {
          return (
            <select
              defaultValue={displayVal}
              onChange={(e) => {
                const next = Number(e.target.value);
                startTransition(() =>
                  onUpdateField(calendarId, row.original.date, "actual_plus", next)
                );
              }}
              className={selectClass}
              disabled={isPending}
            >
              {PLUS_SELECT_VALUES.map((n) => (
                <option key={n} value={n}>
                  +{n}
                </option>
              ))}
            </select>
          );
        }
        return `+${displayVal}`;
      },
    },
    {
      accessorKey: "border_plus2",
      header: "+2ボーダー",
      cell: ({ row, getValue }) => {
        if (!permissions.canViewBorders || hideBordersInSimple) return "";
        const v = getValue<number | null | undefined>();
        if (canEdit) {
          return (
            <input
              type="number"
              min={0}
              defaultValue={v != null ? String(v) : ""}
              onBlur={(e) => {
                const next = e.target.value;
                startTransition(() =>
                  onUpdateField(calendarId, row.original.date, "border_plus2", next === "" ? "" : Number(next))
                );
              }}
              className={inputClass}
              disabled={isPending}
            />
          );
        }
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "border_plus4",
      header: "+4ボーダー",
      cell: ({ row, getValue }) => {
        if (!permissions.canViewBorders || hideBordersInSimple) return "";
        const v = getValue<number | null | undefined>();
        if (canEdit) {
          return (
            <input
              type="number"
              min={0}
              defaultValue={v != null ? String(v) : ""}
              onBlur={(e) => {
                const next = e.target.value;
                startTransition(() =>
                  onUpdateField(calendarId, row.original.date, "border_plus4", next === "" ? "" : Number(next))
                );
              }}
              className={inputClass}
              disabled={isPending}
            />
          );
        }
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "border_plus6",
      header: "+6ボーダー",
      cell: ({ row, getValue }) => {
        if (!permissions.canViewBorders || hideBordersInSimple) return "";
        const v = getValue<number | null | undefined>();
        if (canEdit) {
          return (
            <input
              type="number"
              min={0}
              defaultValue={v != null ? String(v) : ""}
              onBlur={(e) => {
                const next = e.target.value;
                startTransition(() =>
                  onUpdateField(calendarId, row.original.date, "border_plus6", next === "" ? "" : Number(next))
                );
              }}
              className={inputClass}
              disabled={isPending}
            />
          );
        }
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "skip_pass_used",
      header: "スキップ",
      cell: ({ row, getValue }) => {
        const checked = !!getValue<boolean>();
        if (canEdit) {
          return (
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                defaultChecked={checked}
                onChange={(e) => {
                  startTransition(() =>
                    onUpdateField(calendarId, row.original.date, "skip_pass_used", e.target.checked)
                  );
                }}
                className="rounded border-zinc-300 text-pink-500 focus:ring-pink-400"
                disabled={isPending}
              />
              {checked ? "使用" : ""}
            </label>
          );
        }
        return checked ? "使用" : "";
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white/80 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="bg-zinc-50 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-b border-zinc-200 px-3 py-2 text-left font-medium dark:border-zinc-800"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-zinc-100 text-[11px] text-zinc-700 dark:divide-zinc-800 dark:text-zinc-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-1.5 align-top">
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext(),
                  )}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-4 text-center text-[11px] text-zinc-400 dark:text-zinc-500"
              >
                この期間にはまだスケジュールが登録されていません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

