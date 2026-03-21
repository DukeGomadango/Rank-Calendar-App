"use client";

import type { Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";

import type { EventRow } from "@/lib/data/events";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { getEventColorDotClass } from "@/lib/event-colors";
import { TrashIcon } from "@/components/icons/DashboardIcons";
import { ScheduleForm } from "../ScheduleForm";
import { DayScheduleForm } from "./DayScheduleForm";
import type { DayData } from "./types";

export type CalendarDayEditSheetProps = {
  sheetEntered: boolean;
  selectedDate: string;
  selectedDay: DayData;
  calendarId: string;
  events: EventRow[];
  skipPassRemaining?: number;
  handleSave: (formData: FormData) => void;
  effectiveDefaultEventId: string | null | undefined;
  modalTab: "rank" | "schedule";
  setModalTab: (t: "rank" | "schedule") => void;
  saveScheduleAction?: (formData: FormData) => Promise<
    | { ok: true }
    | { ok: false; errors: Record<string, string[]> }
    | void
  >;
  selectedSchedule: CalendarScheduleRow | null;
  scheduleCreatePrefill:
    | null
    | { is_all_day: false; startTime: string; endTime: string; endDate: string };
  selectedSchedules: CalendarScheduleRow[];
  selectedScheduleId: string | null;
  setSelectedScheduleId: (id: string | null) => void;
  setScheduleCreatePrefill: Dispatch<
    SetStateAction<
      | null
      | { is_all_day: false; startTime: string; endTime: string; endDate: string }
    >
  >;
  permissions: CalendarPermissionFlags;
  deleteScheduleAction?: (scheduleId: string) => Promise<void>;
  onClose: () => void;
};

export function CalendarDayEditSheet({
  sheetEntered,
  selectedDate,
  selectedDay,
  calendarId,
  events,
  skipPassRemaining,
  handleSave,
  effectiveDefaultEventId,
  modalTab,
  setModalTab,
  saveScheduleAction,
  selectedSchedule,
  scheduleCreatePrefill,
  selectedSchedules,
  selectedScheduleId,
  setSelectedScheduleId,
  setScheduleCreatePrefill,
  permissions,
  deleteScheduleAction,
  onClose,
}: CalendarDayEditSheetProps) {
  return (
    <div
      className={`fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40 px-0 md:px-4 py-0 md:py-8 transition-opacity duration-200 ${sheetEntered ? "opacity-100" : "opacity-0"} md:opacity-100`}
    >
      <div
        className={`w-full max-h-[85vh] md:max-h-none max-w-md md:max-w-2xl rounded-t-2xl md:rounded-2xl border border-zinc-200 border-b-0 md:border-b bg-white p-4 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-900 overflow-y-auto transition-transform duration-200 ease-out ${sheetEntered ? "translate-y-0" : "translate-y-full md:translate-y-0"}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
              日別スケジュールの編集
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {dayjs(selectedDate).format("YYYY年 M月D日 (ddd)")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            閉じる
          </button>
        </div>

        <div className="mb-3 inline-flex rounded-full bg-zinc-100 p-1 text-[11px] text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
          <button
            type="button"
            onClick={() => setModalTab("rank")}
            className={`rounded-full px-3 py-1 ${
              modalTab === "rank"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            ランク
          </button>
          <button
            type="button"
            onClick={() => setModalTab("schedule")}
            className={`rounded-full px-3 py-1 ${
              modalTab === "schedule"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            予定
          </button>
        </div>

        {modalTab === "rank" && (
          <div className="space-y-3">
            <ScheduleForm
              calendarId={calendarId}
              defaultDate={selectedDate}
              action={handleSave}
              events={events}
              defaultTargetPlus={selectedDay?.entries[0]?.target_plus}
              defaultActualPlus={selectedDay?.entries[0]?.actual_plus}
              defaultAnsukoBaseline={selectedDay?.entries[0]?.ansuko_baseline}
              defaultBorderPlus2={selectedDay?.entries[0]?.border_plus2}
              defaultBorderPlus4={selectedDay?.entries[0]?.border_plus4}
              defaultBorderPlus6={selectedDay?.entries[0]?.border_plus6}
              defaultEventId={effectiveDefaultEventId}
              defaultMemo={selectedDay?.entries[0]?.memo}
              defaultSkipPassUsed={selectedDay?.entries[0]?.skip_pass_used}
              skipPassRemaining={skipPassRemaining}
            />
          </div>
        )}

        {modalTab === "schedule" && (
          <div className="space-y-3">
            {saveScheduleAction && (
              <DayScheduleForm
                calendarId={calendarId}
                date={selectedDate}
                initialSchedule={selectedSchedule}
                prefill={scheduleCreatePrefill}
                saveScheduleAction={saveScheduleAction}
              />
            )}
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50">
                この日の予定一覧
              </p>
              {selectedSchedules.length > 0 && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {selectedSchedules.length}件
                </span>
              )}
            </div>
            {selectedSchedules.length === 0 ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                まだ予定がありません。上のフォームから追加できます。
              </p>
            ) : (
              <ul className="space-y-1">
                {selectedSchedules.map((s, index) => {
                  const isSelected = selectedScheduleId === s.id;
                  const isFirst = index === 0;
                  const isLast = index === selectedSchedules.length - 1;
                  const startLabel = s.is_all_day
                    ? "終日"
                    : s.start_time && s.end_time
                      ? `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`
                      : s.start_time
                        ? s.start_time.slice(0, 5)
                        : "--:--";
                  return (
                    <li
                      key={s.id}
                      onClick={() => {
                        setSelectedScheduleId(s.id);
                        setScheduleCreatePrefill(null);
                      }}
                      className="flex gap-2 text-[11px] text-zinc-800 dark:text-zinc-100 cursor-pointer"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-[5.75rem] shrink-0 text-right text-[9px] leading-tight tabular-nums text-zinc-500 dark:text-zinc-400 pr-1">
                          {startLabel}
                        </div>
                        <div className="relative flex-1">
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 w-px bg-zinc-200 dark:bg-zinc-700 ${
                              isFirst ? "top-2" : "top-0"
                            } ${isLast ? "bottom-2" : "bottom-0"}`}
                          />
                          <div className="relative mt-1 flex items-center justify-center">
                            <span
                              className={`h-2 w-2 rounded-full border ${
                                isSelected
                                  ? "bg-accent-500 border-accent-500"
                                  : getEventColorDotClass(s.color_id ?? null) +
                                    " border-zinc-300 dark:border-zinc-600"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1 ${
                          isSelected
                            ? "bg-accent-50 border border-accent-200 dark:bg-accent-950/40 dark:border-accent-700"
                            : "bg-zinc-50 border border-transparent dark:bg-zinc-800/80"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="mb-0.5 flex items-center gap-1">
                            <span className="inline-flex items-center rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                              {s.kind === "personal"
                                ? "個人"
                                : s.kind === "stream"
                                  ? "配信"
                                  : s.kind === "secret"
                                    ? "秘密"
                                    : "その他"}
                            </span>
                            {!s.is_all_day && (
                              <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                                {s.start_time?.slice(0, 5) ?? "--:--"}
                                {s.end_time && `〜${s.end_time.slice(0, 5)}`}
                                {s.end_date && s.end_date !== s.date
                                  ? ` (${s.end_date.slice(5)})`
                                  : null}
                              </span>
                            )}
                            {s.is_all_day && (
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {s.end_date && s.end_date !== s.date
                                  ? `終日〜${s.end_date.slice(5)}`
                                  : "終日"}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] font-medium">{s.title}</p>
                          {s.memo && (
                            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                              {s.memo}
                            </p>
                          )}
                        </div>
                        {permissions.canEditSchedule && deleteScheduleAction && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteScheduleAction(s.id);
                              if (selectedScheduleId === s.id) {
                                setSelectedScheduleId(null);
                              }
                            }}
                            className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                            aria-label="予定を削除"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
