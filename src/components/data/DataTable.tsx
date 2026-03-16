'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { EventRow } from "@/lib/data/events";
import { toJstDateString } from "@/lib/domain/calendar";
import { PLUS_SELECT_VALUES, normalizePlusValue } from "@/lib/plus-options";
import { useToast } from "@/lib/toast-context";
import { useViewMode } from "@/lib/view-mode-context";
import { DayDetailModal, type DayDetailRow } from "./DayDetailModal";

function updatingKeyFor(date: string, field: string): string {
  return `${date}-${field}`;
}

/** 日付・曜日は必ずあり、他は登録があれば入る。ランク・ランクスコアは周期対応時のみ。skip_pass_remaining_as_of はその日時点のスキパ枚数。 */
type Row = {
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
};

type UpdateFieldAction = (
  calendarId: string,
  date: string,
  field: string,
  value: string | number | boolean
) => Promise<void>;

/** 指定日のスキパ枚数スナップショットを編集する（データタブで行ごとに編集）。 */
type UpdateSkipPassSnapshotAction = (
  calendarId: string,
  asOfDate: string,
  value: number
) => Promise<void>;

type Props = {
  data: Row[];
  permissions: CalendarPermissionFlags;
  calendarId: string;
  onUpdateField: UpdateFieldAction;
  /** 日付詳細モーダル用。渡さない場合は「開く」を出さない。 */
  events?: EventRow[];
  /** スキパ枚数（行ごと）の編集時に呼ぶ。渡すと「スキパ枚数」列が各行で編集可能になる。 */
  onUpdateSkipPassSnapshot?: UpdateSkipPassSnapshotAction;
};

/** 通常時は枠線なし、hover/focus 時のみ枠線。スマホで潰れないよう最小幅を確保 */
const inputClass =
  "w-full min-w-[80px] rounded border border-transparent bg-white px-1.5 py-0.5 text-[11px] text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-accent-400";
const selectClass =
  "w-full min-w-[80px] rounded border border-transparent bg-white px-1 py-0.5 text-[11px] text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-accent-400";
/** スキップパス使用行用：グレーアウト・非活性見た目 */
const inputClassDisabled =
  "w-full min-w-[80px] rounded border border-transparent bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed";
const selectClassDisabled =
  "w-full min-w-[80px] rounded border border-transparent bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed";

export function DataTable({
  data,
  permissions,
  calendarId,
  onUpdateField,
  events = [],
  onUpdateSkipPassSnapshot,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>(data);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const { viewMode } = useViewMode();
  const hideBordersInSimple = !permissions.isOwner && viewMode === "simple";
  const canEdit = permissions.canEditSchedule;
  const todayStr = toJstDateString(new Date());

  useEffect(() => {
    setRows(data);
  }, [data]);

  const handleOptimisticUpdate = (
    date: string,
    field: keyof Row,
    value: string | number | boolean,
    previousValue: string | number | boolean | null | undefined
  ) => {
    setUpdateError(null);
    setRows((prev) =>
      prev.map((r) =>
        r.date === date ? { ...r, [field]: value } : r
      )
    );
    const key = updatingKeyFor(date, field);
    setUpdatingKey(key);
    onUpdateField(calendarId, date, field, value)
      .then(() => {
        setUpdatingKey(null);
        router.refresh();
        showToast("保存しました");
      })
      .catch((err) => {
        setRows((prev) =>
          prev.map((r) =>
            r.date === date ? { ...r, [field]: previousValue } : r
          )
        );
        setUpdatingKey(null);
        setUpdateError(err?.message ?? "更新に失敗しました");
      });
  };

  const handleOptimisticSkipPass = (
    date: string,
    value: number,
    previousValue: number | null | undefined
  ) => {
    if (!onUpdateSkipPassSnapshot) return;
    setUpdateError(null);
    setRows((prev) =>
      prev.map((r) =>
        r.date === date
          ? { ...r, skip_pass_remaining_as_of: value }
          : r
      )
    );
    const key = updatingKeyFor(date, "skip_pass_remaining");
    setUpdatingKey(key);
    onUpdateSkipPassSnapshot(calendarId, date, value)
      .then(() => {
        setUpdatingKey(null);
        router.refresh();
        showToast("保存しました");
      })
      .catch((err) => {
        setRows((prev) =>
          prev.map((r) =>
            r.date === date
              ? { ...r, skip_pass_remaining_as_of: previousValue }
              : r
          )
        );
        setUpdatingKey(null);
        setUpdateError(err?.message ?? "更新に失敗しました");
      });
  };

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

  const targetActualColumns: ColumnDef<Row>[] = permissions.canViewTargetActual
    ? [
        {
          accessorKey: "target_plus",
          header: "目標+",
          cell: ({ row, getValue }) => {
            const v = getValue<number | null | undefined>();
            const displayVal = normalizePlusValue(v);
            const skip = !!row.original.skip_pass_used;
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "target_plus");
            if (canEdit && !skip) {
              return (
                <select
                  value={displayVal}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    handleOptimisticUpdate(date, "target_plus", next, v);
                  }}
                  className={selectClass}
                  disabled={updatingKey === cellKey}
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
            const v = getValue<number | null | undefined>();
            const displayVal = normalizePlusValue(v);
            const skip = !!row.original.skip_pass_used;
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "actual_plus");
            if (canEdit && !skip) {
              return (
                <select
                  value={displayVal}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    handleOptimisticUpdate(date, "actual_plus", next, v);
                  }}
                  className={selectClass}
                  disabled={updatingKey === cellKey}
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
      ]
    : [];

  const showBorders = permissions.canViewBorders && !hideBordersInSimple;
  const borderColumns: ColumnDef<Row>[] = showBorders
    ? [
        {
          accessorKey: "ansuko_baseline",
          header: "アンスコ",
          cell: ({ row, getValue }) => {
            const v = getValue<number | null | undefined>();
            const skip = !!row.original.skip_pass_used;
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "ansuko_baseline");
            if (canEdit && !skip) {
              return (
                <input
                  type="number"
                  min={0}
                  defaultValue={v != null ? String(v) : ""}
                  onBlur={(e) => {
                    const next = e.target.value;
                    const nextVal = next === "" ? "" : Number(next);
                    handleOptimisticUpdate(date, "ansuko_baseline", nextVal, v);
                  }}
                  className={inputClass}
                  disabled={updatingKey === cellKey}
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
          accessorKey: "border_plus2",
          header: "+2ボーダー",
          cell: ({ row, getValue }) => {
            const v = getValue<number | null | undefined>();
            const skip = !!row.original.skip_pass_used;
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "border_plus2");
            if (canEdit && !skip) {
              return (
                <input
                  type="number"
                  min={0}
                  defaultValue={v != null ? String(v) : ""}
                  onBlur={(e) => {
                    const next = e.target.value;
                    const nextVal = next === "" ? "" : Number(next);
                    handleOptimisticUpdate(date, "border_plus2", nextVal, v);
                  }}
                  className={inputClass}
                  disabled={updatingKey === cellKey}
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
            const v = getValue<number | null | undefined>();
            const skip = !!row.original.skip_pass_used;
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "border_plus4");
            if (canEdit && !skip) {
              return (
                <input
                  type="number"
                  min={0}
                  defaultValue={v != null ? String(v) : ""}
                  onBlur={(e) => {
                    const next = e.target.value;
                    const nextVal = next === "" ? "" : Number(next);
                    handleOptimisticUpdate(date, "border_plus4", nextVal, v);
                  }}
                  className={inputClass}
                  disabled={updatingKey === cellKey}
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
            const v = getValue<number | null | undefined>();
            const skip = !!row.original.skip_pass_used;
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "border_plus6");
            if (canEdit && !skip) {
              return (
                <input
                  type="number"
                  min={0}
                  defaultValue={v != null ? String(v) : ""}
                  onBlur={(e) => {
                    const next = e.target.value;
                    const nextVal = next === "" ? "" : Number(next);
                    handleOptimisticUpdate(date, "border_plus6", nextVal, v);
                  }}
                  className={inputClass}
                  disabled={updatingKey === cellKey}
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
      ]
    : [];

  const memoColumn: ColumnDef<Row>[] = permissions.canViewMemo
    ? [
        {
          accessorKey: "memo",
          header: "メモ",
          cell: ({ row }) => {
            const memo = row.original.memo ?? "";
            const date = row.original.date;
            const cellKey = updatingKeyFor(date, "memo");
            if (canEdit) {
              return (
                <input
                  type="text"
                  defaultValue={memo}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const prev = (row.original.memo ?? "").trim();
                    if (v !== prev) {
                      handleOptimisticUpdate(date, "memo", v, row.original.memo);
                    }
                  }}
                  placeholder="メモ"
                  className={inputClass}
                  disabled={updatingKey === cellKey}
                />
              );
            }
            return memo ? <span className="line-clamp-2">{memo}</span> : "—";
          },
        },
      ]
    : [];

  const columns: ColumnDef<Row>[] = [
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
    ...rankColumns,
    ...targetActualColumns,
    ...borderColumns,
    {
      accessorKey: "skip_pass_used",
      header: "スキップ",
      cell: ({ row, getValue }) => {
        const checked = !!getValue<boolean>();
        const date = row.original.date;
        const cellKey = updatingKeyFor(date, "skip_pass_used");
        if (canEdit) {
          return (
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const next = e.target.checked;
                  handleOptimisticUpdate(date, "skip_pass_used", next, checked);
                }}
                className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400"
                disabled={updatingKey === cellKey}
              />
              {checked ? "使用" : ""}
            </label>
          );
        }
        return checked ? "使用" : "";
      },
    },
    {
      id: "skip_pass_remaining",
      header: "スキパ枚数",
      cell: ({ row }: { row: { original: Row } }) => {
        const asOf = row.original.skip_pass_remaining_as_of;
        const date = row.original.date;
        const cellKey = updatingKeyFor(date, "skip_pass_remaining");
        if (canEdit && onUpdateSkipPassSnapshot) {
          return (
            <input
              key={`${date}-${asOf ?? ""}`}
              type="number"
              min={0}
              max={10}
              defaultValue={asOf ?? ""}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 0 && v <= 10) {
                  handleOptimisticSkipPass(date, v, asOf);
                }
              }}
              className={`${inputClass} w-12`}
              disabled={updatingKey === cellKey}
            />
          );
        }
        return asOf != null ? String(asOf) : "—";
      },
    },
    ...memoColumn,
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {updateError && (
        <div
          className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {updateError}
        </div>
      )}
      <div className="isolate min-w-0 overflow-x-auto overflow-y-hidden rounded-xl border border-zinc-200 bg-white/80 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <table className="min-w-full border-separate border-spacing-0 whitespace-nowrap">
        <thead className="bg-zinc-50 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const colId = header.column.id;
                const isDateCol = colId === "date";
                const isWeekdayCol = colId === "weekday";
                const stickyClass = isDateCol
                  ? "sticky left-0 top-0 z-30 min-w-[8.5rem] bg-zinc-50 dark:bg-zinc-900 [transform:translateZ(0)]"
                  : isWeekdayCol
                    ? "sticky left-[8.5rem] top-0 z-30 min-w-[2.5rem] bg-zinc-50 dark:bg-zinc-900 [transform:translateZ(0)]"
                    : "sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 [transform:translateZ(0)]";
                return (
                  <th
                    key={header.id}
                    className={`border-b border-zinc-200 px-3 py-2 text-left font-medium dark:border-zinc-800 ${stickyClass}`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                );
              })}
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
            const stickyBg = isToday
              ? "bg-accent-50/60 dark:bg-accent-950/40"
              : isSkip
                ? "bg-zinc-50/80 dark:bg-zinc-800/50"
                : "bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60";
            const stickyShadow = "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.25)]";
            return (
              <tr key={row.id} className={rowClass}>
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  const isDateCol = colId === "date";
                  const isWeekdayCol = colId === "weekday";
                  const stickyClass = isDateCol
                    ? `sticky left-0 z-30 min-w-[8.5rem] ${stickyBg} ${stickyShadow}`
                    : isWeekdayCol
                      ? `sticky left-[8.5rem] z-30 min-w-[2.5rem] ${stickyBg} ${stickyShadow}`
                      : "relative z-0";
                  return (
                    <td
                      key={cell.id}
                      className={`px-3 py-1.5 align-top ${stickyClass}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
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

