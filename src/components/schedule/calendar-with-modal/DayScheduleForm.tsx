"use client";

import { useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { MantineProvider } from "@mantine/core";
import { TimeInput } from "@mantine/dates";

import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { EVENT_PALETTE } from "@/lib/event-colors";

export type DayScheduleActionResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };

export type DayScheduleFormProps = {
  calendarId: string;
  date: string;
  initialSchedule?: CalendarScheduleRow | null;
  prefill?: {
    is_all_day: false;
    startTime: string;
    endTime: string;
    endDate: string;
  } | null;
  saveScheduleAction: (formData: FormData) => Promise<
    DayScheduleActionResult | void
  >;
};

export function DayScheduleForm({
  calendarId,
  date,
  initialSchedule,
  prefill,
  saveScheduleAction,
}: DayScheduleFormProps) {
  const idPrefix = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { pending } = useFormStatus();
  const loading = pending || isSubmitting;
  const startDateForEdit = initialSchedule?.date ?? date;

  const [startTime, setStartTime] = useState<string>(
    initialSchedule?.start_time ? initialSchedule.start_time.slice(0, 5) : prefill?.startTime ?? ""
  );
  const [endTime, setEndTime] = useState<string>(
    initialSchedule?.end_time ? initialSchedule.end_time.slice(0, 5) : prefill?.endTime ?? ""
  );
  const [endDate, setEndDate] = useState<string>(
    initialSchedule?.end_date ?? prefill?.endDate ?? startDateForEdit
  );

  useEffect(() => {
    const nextStartDate = initialSchedule?.date ?? date;
    setStartTime(
      initialSchedule?.start_time ? initialSchedule.start_time.slice(0, 5) : prefill?.startTime ?? ""
    );
    setEndTime(
      initialSchedule?.end_time ? initialSchedule.end_time.slice(0, 5) : prefill?.endTime ?? ""
    );
    setEndDate(initialSchedule?.end_date ?? prefill?.endDate ?? nextStartDate);
  }, [
    date,
    initialSchedule?.id,
    initialSchedule?.date,
    initialSchedule?.end_date,
    initialSchedule?.start_time,
    initialSchedule?.end_time,
    prefill?.startTime,
    prefill?.endTime,
    prefill?.endDate,
  ]);

  const getError = (name: string) => fieldErrors[name]?.[0];
  const inputErrorClass =
    "border-amber-500 focus:border-amber-500 focus:ring-amber-300 dark:border-amber-500";
  const inputBaseClass =
    "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const result = (await saveScheduleAction(
        new FormData(e.currentTarget)
      )) as DayScheduleActionResult | void;
      if (result && "ok" in result && !result.ok) {
        setFieldErrors(result.errors);
      } else if (result && "ok" in result && result.ok) {
        (e.target as HTMLFormElement).reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollFocusedIntoView = (e: React.FocusEvent) => {
    const el = e.target as HTMLElement;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={scrollFocusedIntoView}
      className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 text-[11px] dark:border-slate-600 dark:bg-slate-900/60"
    >
      <input type="hidden" name="calendar_id" value={calendarId} />
      <input type="hidden" name="date" value={startDateForEdit} />
      <input type="hidden" name="end_date" value={endDate} />
      <input type="hidden" name="start_time" value={startTime} />
      <input type="hidden" name="end_time" value={endTime} />
      {initialSchedule && <input type="hidden" name="id" value={initialSchedule.id} />}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">予定の入力内容を確認してください</p>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-title`} className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">タイトル</span>
          <input
            id={`${idPrefix}-title`}
            name="title"
            type="text"
            placeholder="歌枠・雑談・予定名など"
            defaultValue={initialSchedule?.title ?? ""}
            aria-invalid={!!getError("title")}
            className={getError("title") ? `${inputBaseClass} ${inputErrorClass}` : inputBaseClass}
          />
          {getError("title") && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400" role="alert">
              {getError("title")}
            </span>
          )}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            name="is_all_day"
            defaultChecked={initialSchedule?.is_all_day ?? false}
            className="h-3 w-3 rounded border-zinc-300 text-accent-500 focus:ring-accent-400 dark:border-zinc-600"
          />
          <span className="text-[10px] text-zinc-600 dark:text-zinc-300">終日</span>
        </label>
        <div className="flex items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-400">
          <span>時間</span>
          <div className="flex items-center gap-1 md:hidden">
            <input
              type="time"
              className={`${inputBaseClass} h-6 w-20`}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <span>〜</span>
            <input
              type="time"
              className={`${inputBaseClass} h-6 w-20`}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <MantineProvider>
              <TimeInput
                className="w-24"
                value={startTime}
                onChange={(event) => setStartTime(event.currentTarget.value)}
                withSeconds={false}
                aria-label="開始時刻"
              />
            </MantineProvider>
            <span>〜</span>
            <MantineProvider>
              <TimeInput
                className="w-24"
                value={endTime}
                onChange={(event) => setEndTime(event.currentTarget.value)}
                withSeconds={false}
                aria-label="終了時刻"
              />
            </MantineProvider>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">終了日</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputBaseClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-600 dark:text-zinc-400">種別</span>
          <select
            name="kind"
            className={`${inputBaseClass} h-7`}
            defaultValue={initialSchedule?.kind ?? "stream"}
          >
            <option value="stream">配信</option>
            <option value="personal">個人</option>
            <option value="secret">秘密</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-zinc-600 dark:text-zinc-400">色</span>
          <div className="flex flex-wrap gap-1">
            {EVENT_PALETTE.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-0.5">
                <input
                  type="radio"
                  name="color_id"
                  value={c.id}
                  defaultChecked={(initialSchedule?.color_id ?? "rose") === c.id}
                  className="sr-only peer"
                />
                <span
                  className={`block h-4 w-4 rounded border-2 border-transparent peer-checked:border-zinc-800 peer-checked:ring-1 peer-checked:ring-zinc-600 dark:peer-checked:border-zinc-200 ${c.swatch}`}
                  title={c.label}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-memo`} className="flex flex-col gap-1">
          <span className="text-[10px] text-zinc-600 dark:text-zinc-400">メモ（任意）</span>
          <textarea
            id={`${idPrefix}-memo`}
            name="memo"
            rows={2}
            className={inputBaseClass}
            defaultValue={initialSchedule?.memo ?? ""}
            placeholder="配信の詳細や準備メモなど"
          />
          {getError("memo") && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400" role="alert">
              {getError("memo")}
            </span>
          )}
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 focus:ring-offset-zinc-50 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-offset-zinc-900"
        >
          {loading ? "保存中..." : initialSchedule ? "予定を更新" : "予定を保存"}
        </button>
      </div>
    </form>
  );
}
