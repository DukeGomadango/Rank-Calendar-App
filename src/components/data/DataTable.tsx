'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { useState, useTransition } from "react";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { EventRow } from "@/lib/data/events";
import { PLUS_SELECT_VALUES, normalizePlusValue } from "@/lib/plus-options";
import { useViewMode } from "@/lib/view-mode-context";
import { DayDetailModal, type DayDetailRow } from "./DayDetailModal";

/** 日付・曜日は必ずあり、他は登録があれば入る。ランク・ランクスコアは周期対応時のみ。 */
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
  current_rank?: string | null;
  rank_score_cumulative?: number | null;
  memo?: string | null;
  event_id?: string | null;
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
  /** 日付詳細モーダル用。渡さない場合は「開く」を出さない。 */
  events?: EventRow[];
};

/** 通常時は枠線なし、hover/focus 時のみ枠線（モダンなテーブルUX） */
const inputClass =
  "w-full min-w-[2.5rem] rounded border border-transparent bg-white px-1.5 py-0.5 text-[11px] text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-accent-400";
const selectClass =
  "w-full min-w-[2.5rem] rounded border border-transparent bg-white px-1 py-0.5 text-[11px] text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-accent-400";
/** スキップパス使用行用：グレーアウト・非活性見た目 */
const inputClassDisabled =
  "w-full min-w-[2.5rem] rounded border border-transparent bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed";
const selectClassDisabled =
  "w-full min-w-[2.5rem] rounded border border-transparent bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed";

export function DataTable({
  data,
  permissions,
  calendarId,
  onUpdateField,
  events = [],
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const { viewMode } = useViewMode();
  const hideBordersInSimple = !permissions.isOwner && viewMode === "simple";
  const canEdit = permissions.canEditSchedule;
  const todayStr = dayjs().format("YYYY-MM-DD");

  const rankColumns: ColumnDef<Row>[] = permissions.canViewRank
    ? [
        {
          accessorKey: "current_rank",
          header: "ランク",
          cell: ({ row }) => row.original.current_rank ?? "—",
        },
        {
          accessorKey: "rank_score_cumulative",
          header: "ランクスコア",
          cell: ({ row }) => {
            const v = row.original.rank_score_cumulative;
            return v != null ? String(v) : "—";
          },
        },
      ]
    : [];

  const columns: ColumnDef<Row>[] = [
    ...rankColumns,
    {
      accessorKey: "date",
      header: "日付",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setDetailRow(row.original)}
          className="flex items-center gap-1 text-left hover:opacity-80"
        >
          <span>{dayjs(row.original.date).format("YYYY-MM-DD")}</span>
          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
            ›
          </span>
        </button>
      ),
    },
    {
      accessorKey: "weekday",
      header: "曜",
      cell: ({ row }) => {
        const w = row.original.weekday;
        if (w === "日")
          return <span className="text-red-500 dark:text-red-400">{w}</span>;
        if (w === "土")
          return <span className="text-blue-600 dark:text-blue-400">{w}</span>;
        return w;
      },
    },
    {
      accessorKey: "target_plus",
      header: "目標+",
      cell: ({ row, getValue }) => {
        if (!permissions.canViewTargetActual) return "";
        const v = getValue<number | null | undefined>();
        const displayVal = normalizePlusValue(v);
        const skip = !!row.original.skip_pass_used;
        if (canEdit && !skip) {
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
        if (canEdit && skip) {
          return (
            <select
              defaultValue={displayVal}
              className={selectClassDisabled}
              disabled
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
        const skip = !!row.original.skip_pass_used;
        if (canEdit && !skip) {
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
        if (canEdit && skip) {
          return (
            <select
              defaultValue={displayVal}
              className={selectClassDisabled}
              disabled
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
        const skip = !!row.original.skip_pass_used;
        if (canEdit && !skip) {
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
        if (canEdit && skip) {
          return (
            <input
              type="number"
              min={0}
              defaultValue={v != null ? String(v) : ""}
              className={inputClassDisabled}
              disabled
              readOnly
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
        const skip = !!row.original.skip_pass_used;
        if (canEdit && !skip) {
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
        if (canEdit && skip) {
          return (
            <input
              type="number"
              min={0}
              defaultValue={v != null ? String(v) : ""}
              className={inputClassDisabled}
              disabled
              readOnly
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
        const skip = !!row.original.skip_pass_used;
        if (canEdit && !skip) {
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
        if (canEdit && skip) {
          return (
            <input
              type="number"
              min={0}
              defaultValue={v != null ? String(v) : ""}
              className={inputClassDisabled}
              disabled
              readOnly
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
                className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400"
                disabled={isPending}
              />
              {checked ? "使用" : ""}
            </label>
          );
        }
        return checked ? "使用" : "";
      },
    },
    {
      accessorKey: "memo",
      header: "メモ",
      cell: ({ row }) => {
        if (!permissions.canViewMemo) {
          return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
        }
        const memo = row.original.memo ?? "";
        if (canEdit) {
          return (
            <input
              type="text"
              defaultValue={memo}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const prev = (row.original.memo ?? "").trim();
                if (v !== prev) {
                  startTransition(() =>
                    onUpdateField(calendarId, row.original.date, "memo", v)
                  );
                }
              }}
              placeholder="メモ"
              className={inputClass}
              disabled={isPending}
            />
          );
        }
        return memo ? <span className="line-clamp-2">{memo}</span> : "—";
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
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
          {table.getRowModel().rows.map((row) => {
            const isToday = row.original.date === todayStr;
            const isSkip = !!row.original.skip_pass_used;
            const rowClass = [
              "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60 transition-colors",
              isToday && "border-l-4 border-l-accent-500 bg-accent-50/60 dark:bg-accent-950/40 dark:border-l-accent-400",
              isSkip && "bg-zinc-50/80 dark:bg-zinc-800/50",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <tr key={row.id} className={rowClass}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5 align-top">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
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
      {detailRow && (
        <DayDetailModal
          row={detailRow as DayDetailRow}
          events={events}
          permissions={permissions}
          calendarId={calendarId}
          onUpdateField={onUpdateField}
          onClose={() => setDetailRow(null)}
        />
      )}
    </>
  );
}

