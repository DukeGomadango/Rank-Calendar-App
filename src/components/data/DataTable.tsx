'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import dayjs from "dayjs";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";

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

type Props = {
  data: Row[];
  permissions: CalendarPermissionFlags;
};

export function DataTable({ data, permissions }: Props) {
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
      cell: ({ getValue }) => {
        if (!permissions.canViewTargetActual) return "";
        const v = getValue<number | null | undefined>();
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "actual_plus",
      header: "実績+",
      cell: ({ getValue }) => {
        if (!permissions.canViewTargetActual) return "";
        const v = getValue<number | null | undefined>();
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "border_plus2",
      header: "+2ボーダー",
      cell: ({ getValue }) => {
        if (!permissions.canViewBorders) return "";
        const v = getValue<number | null | undefined>();
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "border_plus4",
      header: "+4ボーダー",
      cell: ({ getValue }) => {
        if (!permissions.canViewBorders) return "";
        const v = getValue<number | null | undefined>();
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "border_plus6",
      header: "+6ボーダー",
      cell: ({ getValue }) => {
        if (!permissions.canViewBorders) return "";
        const v = getValue<number | null | undefined>();
        return v != null ? String(v) : "";
      },
    },
    {
      accessorKey: "skip_pass_used",
      header: "スキップ",
      cell: ({ getValue }) => (getValue<boolean>() ? "使用" : ""),
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

