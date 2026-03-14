"use client";

import { useState, useTransition } from "react";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { EventRow } from "@/lib/data/events";
import { PLUS_SELECT_VALUES } from "@/lib/plus-options";

export type DayDetailRow = {
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

function eventsOnDate(events: EventRow[], date: string): EventRow[] {
  return events.filter((ev) => {
    const start = ev.start_date ?? date;
    const end = ev.end_date ?? date;
    return start <= date && end >= date;
  });
}

function EmptyOrValue({
  value,
  type = "text",
}: {
  value: string | number | null | undefined;
  type?: "text" | "plus";
}) {
  const empty = value === null || value === undefined || value === "";
  if (empty)
    return (
      <span className="text-zinc-400 dark:text-zinc-500">未入力</span>
    );
  if (type === "plus" && typeof value === "number")
    return <span>+{value}</span>;
  return <span>{String(value)}</span>;
}

type UpdateFieldAction = (
  calendarId: string,
  date: string,
  field: string,
  value: string | number | boolean
) => Promise<void>;

type Props = {
  row: DayDetailRow;
  events: EventRow[];
  permissions: CalendarPermissionFlags;
  calendarId?: string;
  onUpdateField?: UpdateFieldAction;
  onClose: () => void;
};

export function DayDetailModal({
  row: initialRow,
  events,
  permissions,
  calendarId,
  onUpdateField,
  onClose,
}: Props) {
  const [row, setRow] = useState(initialRow);
  const [isPending, startTransition] = useTransition();
  const dayEvents = eventsOnDate(events, row.date);
  const canEdit = permissions.canEditSchedule && calendarId && onUpdateField;
  const isSkip = !!row.skip_pass_used;

  const update = (field: keyof DayDetailRow, value: unknown) => {
    setRow((prev) => ({ ...prev, [field]: value }));
    if (canEdit && calendarId && onUpdateField)
      startTransition(() =>
        onUpdateField(calendarId, row.date, field, value as string | number | boolean)
      );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-labelledby="day-detail-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー: 日付 + ランクバッジ + 閉じる */}
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 p-4 dark:border-zinc-700">
          <div className="min-w-0 flex-1">
            <h2
              id="day-detail-modal-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {row.date}（{row.weekday}）
            </h2>
            {permissions.canViewRank && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    row.current_rank
                      ? "bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-200"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {row.current_rank ?? "ランク未設定"}
                </span>
                {row.rank_score_cumulative != null && (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    スコア: {row.rank_score_cumulative}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            閉じる
          </button>
        </div>

        <div className="space-y-4 p-4 text-xs">
          {/* メイン: 目標+ と 実績+ を大きく */}
          {permissions.canViewTargetActual && (
            <section>
              <h3 className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                目標・実績
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-accent-50/80 p-3 dark:bg-accent-950/30">
                  <p className="text-[10px] text-accent-700 dark:text-accent-300">
                    目標+
                  </p>
                  {canEdit && !isSkip ? (
                    <select
                      value={row.target_plus ?? 0}
                      onChange={(e) =>
                        update("target_plus", Number(e.target.value))
                      }
                      disabled={isPending}
                      className="mt-0.5 w-full rounded border border-accent-200 bg-white px-2 py-1.5 text-base font-semibold text-zinc-900 dark:border-accent-800 dark:bg-slate-800 dark:text-zinc-50"
                    >
                      {PLUS_SELECT_VALUES.map((n) => (
                        <option key={n} value={n}>
                          +{n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {row.target_plus != null ? (
                        <>+{row.target_plus}</>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          未入力
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-accent-50/80 p-3 dark:bg-accent-950/30">
                  <p className="text-[10px] text-accent-700 dark:text-accent-300">
                    実績+
                  </p>
                  {canEdit && !isSkip ? (
                    <select
                      value={row.actual_plus ?? 0}
                      onChange={(e) =>
                        update("actual_plus", Number(e.target.value))
                      }
                      disabled={isPending}
                      className="mt-0.5 w-full rounded border border-accent-200 bg-white px-2 py-1.5 text-base font-semibold text-zinc-900 dark:border-accent-800 dark:bg-slate-800 dark:text-zinc-50"
                    >
                      {PLUS_SELECT_VALUES.map((n) => (
                        <option key={n} value={n}>
                          +{n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {row.actual_plus != null ? (
                        <>+{row.actual_plus}</>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          未入力
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ボーダー: 横3列グリッド */}
          {permissions.canViewBorders && (
            <section>
              <h3 className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                ボーダー
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "border_plus2" as const, label: "+2" },
                  { key: "border_plus4" as const, label: "+4" },
                  { key: "border_plus6" as const, label: "+6" },
                ].map(({ key, label }) => (
                  <div
                    key={key}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {label}
                    </p>
                    {canEdit && !isSkip ? (
                      <input
                        type="number"
                        min={0}
                        value={row[key] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRow((prev) => ({
                            ...prev,
                            [key]: v === "" ? null : Number(v),
                          }));
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (calendarId && onUpdateField)
                            startTransition(() =>
                              onUpdateField(
                                calendarId,
                                row.date,
                                key,
                                v === "" ? "" : Number(v)
                              )
                            );
                        }}
                        disabled={isPending}
                        className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px] dark:border-zinc-600 dark:bg-slate-800"
                      />
                    ) : (
                      <p className="mt-0.5 text-[11px] text-zinc-700 dark:text-zinc-200">
                        <EmptyOrValue value={row[key]} type="text" />
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* スキップ */}
          <section className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              スキップパス
            </span>
            {canEdit ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!row.skip_pass_used}
                  onChange={(e) => update("skip_pass_used", e.target.checked)}
                  disabled={isPending}
                  className="rounded border-zinc-300 text-accent-500 focus:ring-accent-400"
                />
                <span className="text-[11px]">使用</span>
              </label>
            ) : (
              <span className="text-[11px] text-zinc-700 dark:text-zinc-200">
                {row.skip_pass_used ? "使用" : "未使用"}
              </span>
            )}
          </section>

          {/* メモ */}
          {permissions.canViewMemo && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                メモ
              </h3>
              {canEdit ? (
                <textarea
                  value={row.memo ?? ""}
                  onChange={(e) =>
                    setRow((prev) => ({ ...prev, memo: e.target.value }))
                  }
                  onBlur={(e) => {
                    if (calendarId && onUpdateField)
                      startTransition(() =>
                        onUpdateField(
                          calendarId,
                          row.date,
                          "memo",
                          e.target.value.trim()
                        )
                      );
                  }}
                  disabled={isPending}
                  rows={3}
                  placeholder="未入力"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-slate-800 dark:placeholder:text-zinc-500"
                />
              ) : row.memo?.trim() ? (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
                  {row.memo}
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  未入力
                </p>
              )}
            </section>
          )}

          {/* イベント（該当ありのみ表示） */}
          {permissions.canViewEvents && dayEvents.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                イベント
              </h3>
              <ul className="list-inside list-disc space-y-0.5 text-[11px] text-zinc-700 dark:text-zinc-200">
                {dayEvents.map((ev) => (
                  <li key={ev.id}>{ev.name}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* フッター: 閉じる（プライマリ） */}
        <div className="flex justify-end border-t border-zinc-100 p-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent-500 px-4 py-2 text-[11px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-50 dark:bg-accent-600 dark:hover:bg-accent-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
