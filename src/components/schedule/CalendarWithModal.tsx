'use client';

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ja";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
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
  calendarId: string;
  days: DayData[];
  permissions: CalendarPermissionFlags;
  saveAction: (formData: FormData) => void;
  events: { id: string; name: string }[];
};

export function CalendarWithModal({
  calendarName,
  monthLabel,
  calendarId,
  days,
  permissions,
  saveAction,
  events,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const selectedDay = selectedDate
    ? days.find((d) => d.date === selectedDate) ?? null
    : null;

  const weekDays = useMemo(() => {
    const ref = dayjs();
    const start = ref.startOf("week");
    const end = ref.endOf("week");
    return days.filter((d) => {
      const t = dayjs(d.date);
      return (t.isSame(start) || t.isAfter(start)) && (t.isSame(end) || t.isBefore(end));
    });
  }, [days]);

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

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                if (permissions.canEditSchedule) {
                  setSelectedDate(day.date);
                }
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
                      {permissions.canViewTargetActual && entry.actual_plus != null && (
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

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                if (permissions.canEditSchedule) {
                  setSelectedDate(day.date);
                }
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
                  {permissions.canViewBorders && (
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
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            カレンダー
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {calendarName} の {monthLabel}
            のスケジュールを表示しています。
          </p>
        </div>
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
      </header>

      {view === "week" ? renderWeekGrid() : renderMonthGrid()}

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
            />
          </div>
        </div>
      )}
    </div>
  );
}

