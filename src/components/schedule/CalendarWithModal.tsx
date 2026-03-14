"use client";

import { useMemo, useState, useTransition } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import Link from "next/link";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { useViewMode } from "@/lib/view-mode-context";
import { ScheduleForm } from "./ScheduleForm";

dayjs.locale("ja");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type DayData = {
  date: string; // YYYY-MM-DD
  isToday: boolean;
  isCurrentMonth: boolean;
  weekday: number; // 0=Sun
  holidayName: string | null;
  entries: ScheduleEntryRow[];
};

type Props = {
  calendarName: string;
  monthLabel: string;
  /** 表示中の月 YYYY-MM */
  currentMonthParam: string;
  /** 週表示で使う週の開始日（日曜）YYYY-MM-DD */
  currentWeekStart: string;
  calendarId: string;
  days: DayData[];
  permissions: CalendarPermissionFlags;
  moveEntry: (calendarId: string, fromDate: string, toDate: string) => Promise<void>;
  saveAction: (formData: FormData) => void;
  events: { id: string; name: string }[];
};

export function CalendarWithModal({
  calendarName,
  monthLabel,
  currentMonthParam,
  currentWeekStart,
  calendarId,
  days,
  permissions,
  moveEntry,
  saveAction,
  events,
}: Props) {
  const { viewMode } = useViewMode();
  const useSimpleView = !permissions.isOwner && viewMode === "simple";

  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const selectedDay = selectedDate
    ? days.find((d) => d.date === selectedDate) ?? null
    : null;

  const prevMonthParam = useMemo(() => {
    const d = dayjs(currentMonthParam, "YYYY-MM").subtract(1, "month");
    return d.format("YYYY-MM");
  }, [currentMonthParam]);
  const nextMonthParam = useMemo(() => {
    const d = dayjs(currentMonthParam, "YYYY-MM").add(1, "month");
    return d.format("YYYY-MM");
  }, [currentMonthParam]);

  const prevWeekStart = useMemo(() => {
    return dayjs(currentWeekStart).subtract(7, "day").format("YYYY-MM-DD");
  }, [currentWeekStart]);
  const nextWeekStart = useMemo(() => {
    return dayjs(currentWeekStart).add(7, "day").format("YYYY-MM-DD");
  }, [currentWeekStart]);
  const prevWeekMonth = useMemo(() => dayjs(prevWeekStart).format("YYYY-MM"), [prevWeekStart]);
  const nextWeekMonth = useMemo(() => dayjs(nextWeekStart).format("YYYY-MM"), [nextWeekStart]);

  const weekDays = useMemo(() => {
    const start = dayjs(currentWeekStart);
    const end = start.add(6, "day");
    return days.filter((d) => {
      const t = dayjs(d.date);
      return (t.isSame(start) || t.isAfter(start)) && (t.isSame(end) || t.isBefore(end));
    });
  }, [days, currentWeekStart]);

  const renderMonthGrid = () => (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {WEEKDAYS.map((label, idx) => {
          const isSun = idx === 0;
          const isSat = idx === 6;
          const base =
            "py-1 text-center font-medium tracking-tight bg-zinc-50 dark:bg-zinc-900";
          const weekend =
            isSun || isSat
              ? isSun
                ? "text-red-500"
                : "text-blue-500"
              : "text-zinc-600 dark:text-zinc-300";
          return (
            <div key={label} className={`${base} ${weekend}`}>
              {label}
            </div>
          );
        })}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {days.map((day) => {
          const dateObj = dayjs(day.date);

          let textColor = "text-zinc-800 dark:text-zinc-100";
          if (!day.isCurrentMonth) {
            textColor = "text-zinc-400 dark:text-zinc-500";
          } else if (day.holidayName || day.weekday === 0) {
            textColor = "text-red-500";
          } else if (day.weekday === 6) {
            textColor = "text-blue-500";
          }

          const bg = day.isToday
            ? "bg-pink-50 dark:bg-pink-950/40"
            : "bg-white dark:bg-zinc-900";

          const hasEntry = day.entries.length > 0;

          const canDrop =
            permissions.isOwner && (!day.entries.length || !day.entries[0].skip_pass_used);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                if (permissions.canEditSchedule) {
                  setSelectedDate(day.date);
                }
              }}
              onDragOver={(e) => {
                if (canDrop) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!canDrop || !permissions.isOwner) return;
                const fromDate = e.dataTransfer.getData("text/plain");
                if (!fromDate || fromDate === day.date) return;
                startTransition(() => {
                  void moveEntry(calendarId, fromDate, day.date);
                });
              }}
              className={`${bg} relative flex min-h-[72px] flex-col border border-zinc-200/80 p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 dark:border-zinc-800/80`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${textColor}`}>
                  {dateObj.date()}
                </span>
                {day.isToday && (
                  <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
                    今日
                  </span>
                )}
              </div>

              {day.holidayName && (
                <span className="mt-0.5 line-clamp-1 text-[9px] text-red-500">
                  {day.holidayName}
                </span>
              )}

              {hasEntry && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {day.entries.map((entry) => (
                    <span
                      key={entry.id}
                      className="inline-flex items-center rounded-full bg-zinc-900/5 px-1.5 py-0.5 text-[9px] text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-100"
                    >
                      {permissions.canViewTargetActual && entry.target_plus != null && (
                        <span className="mr-1 text-[9px] font-semibold text-pink-500">
                          目{entry.target_plus}
                        </span>
                      )}
                      {!useSimpleView && permissions.canViewTargetActual && entry.actual_plus != null && (
                        <span className="text-[9px] text-zinc-700 dark:text-zinc-200">
                          実{entry.actual_plus}
                        </span>
                      )}
                      {entry.skip_pass_used && (
                        <span className="ml-1 rounded bg-zinc-900/10 px-1 text-[8px] text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-100">
                          スキップ
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderWeekGrid = () => (
    <section className="rounded-xl border border-zinc-200 bg-white/80 p-3 text-xs shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {WEEKDAYS.map((label, idx) => {
          const isSun = idx === 0;
          const isSat = idx === 6;
          const base =
            "py-1 text-center font-medium tracking-tight bg-zinc-50 dark:bg-zinc-900";
          const weekend =
            isSun || isSat
              ? isSun
                ? "text-red-500"
                : "text-blue-500"
              : "text-zinc-600 dark:text-zinc-300";
          return (
            <div key={label} className={`${base} ${weekend}`}>
              {label}
            </div>
          );
        })}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-px rounded-lg bg-zinc-200 text-[11px] dark:bg-zinc-800">
        {weekDays.map((day) => {
          const dateObj = dayjs(day.date);
          const entry = day.entries[0];

          let textColor = "text-zinc-800 dark:text-zinc-100";
          if (!day.isCurrentMonth) {
            textColor = "text-zinc-400 dark:text-zinc-500";
          } else if (day.holidayName || day.weekday === 0) {
            textColor = "text-red-500";
          } else if (day.weekday === 6) {
            textColor = "text-blue-500";
          }

          const bg = day.isToday
            ? "bg-pink-50 dark:bg-pink-950/40"
            : "bg-white dark:bg-zinc-900";

          const canDrop =
            permissions.isOwner && (!entry || !entry.skip_pass_used);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                if (permissions.canEditSchedule) {
                  setSelectedDate(day.date);
                }
              }}
              onDragOver={(e) => {
                if (canDrop) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!canDrop || !permissions.isOwner) return;
                const fromDate = e.dataTransfer.getData("text/plain");
                if (!fromDate || fromDate === day.date) return;
                startTransition(() => {
                  void moveEntry(calendarId, fromDate, day.date);
                });
              }}
              className={`${bg} relative flex min-h-[140px] flex-col border border-zinc-200/80 p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 dark:border-zinc-800/80`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[12px] font-semibold ${textColor}`}>
                    {dateObj.format("D日")}
                  </span>
                  <span className="ml-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    ({WEEKDAYS[day.weekday]})
                  </span>
                </div>
                {day.isToday && (
                  <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-medium text-white">
                    今日
                  </span>
                )}
              </div>

              {day.holidayName && (
                <p className="mt-0.5 text-[10px] text-red-500">{day.holidayName}</p>
              )}

                {entry ? (
                <div className="mt-2 space-y-1 text-[11px] text-zinc-700 dark:text-zinc-200">
                  <p>
                    <span className="font-semibold text-pink-500">目標+</span>{" "}
                    {permissions.canViewTargetActual ? entry.target_plus ?? "-" : "非公開"}{" "}
                    <span className="ml-2 font-semibold text-zinc-700 dark:text-zinc-200">
                      実績+
                    </span>{" "}
                    {permissions.canViewTargetActual ? entry.actual_plus ?? "-" : "非公開"}
                  </p>
                  {!useSimpleView && permissions.canViewBorders && (
                    <p className="text-[10px]">
                      +2: {entry.border_plus2 ?? "-"} / +4: {entry.border_plus4 ?? "-"} / +6:{" "}
                      {entry.border_plus6 ?? "-"}
                    </p>
                  )}
                  {entry.skip_pass_used && (
                    <p className="inline-flex rounded bg-zinc-900/10 px-1.5 py-0.5 text-[10px] text-zinc-800 dark:bg-zinc-50/10 dark:text-zinc-100">
                      スキップパス使用日
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-[10px] text-zinc-400 dark:text-zinc-600">
                  この週のこの日はまだ登録がありません。
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            カレンダー
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {calendarName} の {monthLabel}
            のスケジュールを表示しています。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-0.5 text-zinc-700 dark:text-zinc-200">
            {view === "month" ? (
              <>
                <Link
                  href={`/dashboard/calendar?month=${prevMonthParam}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="前月"
                >
                  ‹
                </Link>
                <Link
                  href={`/dashboard/calendar?month=${nextMonthParam}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="次月"
                >
                  ›
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/dashboard/calendar?month=${prevWeekMonth}&week=${prevWeekStart}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="前週"
                >
                  ‹
                </Link>
                <Link
                  href={`/dashboard/calendar?month=${nextWeekMonth}&week=${nextWeekStart}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  aria-label="次週"
                >
                  ›
                </Link>
              </>
            )}
          </nav>
          <div className="hidden items-center gap-1 rounded-full bg-zinc-100 p-1 text-[11px] text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300 md:flex">
          <button
            type="button"
            onClick={() => setView("month")}
            className={`rounded-full px-3 py-1 ${
              view === "month"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : ""
            }`}
          >
            月
          </button>
          <button
            type="button"
            onClick={() => setView("week")}
            className={`rounded-full px-3 py-1 ${
              view === "week"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : ""
            }`}
            >
            週
          </button>
          </div>
        </div>
      </header>

      {view === "week" ? renderWeekGrid() : renderMonthGrid()}

      {isPending && (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          日付を移動中です…
        </p>
      )}

      {permissions.canEditSchedule && selectedDate && selectedDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
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
                onClick={() => setSelectedDate(null)}
                className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                閉じる
              </button>
            </div>

            <ScheduleForm
              calendarId={calendarId}
              defaultDate={selectedDate}
              action={saveAction}
              events={events}
              defaultTargetPlus={selectedDay?.entries[0]?.target_plus}
              defaultActualPlus={selectedDay?.entries[0]?.actual_plus}
            />
          </div>
        </div>
      )}
    </div>
  );
}

