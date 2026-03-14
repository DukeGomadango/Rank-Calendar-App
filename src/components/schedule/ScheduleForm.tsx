'use client';

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

import { BorderOcrButton } from "@/components/ocr/BorderOcrButton";
import { PLUS_SELECT_VALUES, normalizePlusValue } from "@/lib/plus-options";

type ScheduleFormProps = {
  calendarId: string;
  defaultDate: string;
  action: (formData: FormData) => void;
  events?: { id: string; name: string }[];
  /** 既存の目標+（モーダルでその日のデータを開くとき用） */
  defaultTargetPlus?: number | null;
  /** 既存の実績+（モーダルでその日のデータを開くとき用） */
  defaultActualPlus?: number | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-accent-500 px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 focus:ring-offset-zinc-50 disabled:opacity-60 dark:focus:ring-offset-zinc-900"
    >
      {pending ? "保存中..." : "保存する"}
    </button>
  );
}

export function ScheduleForm({
  calendarId,
  defaultDate,
  action,
  events,
  defaultTargetPlus,
  defaultActualPlus,
}: ScheduleFormProps) {
  const idPrefix = useId();
  const border2Ref = useRef<HTMLInputElement | null>(null);
  const border4Ref = useRef<HTMLInputElement | null>(null);
  const border6Ref = useRef<HTMLInputElement | null>(null);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="calendar_id" value={calendarId} />

      <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-date`}>
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          日付
        </span>
        <input
          id={`${idPrefix}-date`}
          type="date"
          name="date"
          defaultValue={defaultDate}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-border2`}>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            +2 ボーダー
          </span>
          <input
            id={`${idPrefix}-border2`}
            type="number"
            name="border_plus2"
            min={0}
          ref={border2Ref}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-border4`}>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            +4 ボーダー
          </span>
          <input
            id={`${idPrefix}-border4`}
            type="number"
            name="border_plus4"
            min={0}
          ref={border4Ref}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-border6`}>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            +6 ボーダー
          </span>
          <input
            id={`${idPrefix}-border6`}
            type="number"
            name="border_plus6"
            min={0}
          ref={border6Ref}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      <BorderOcrButton
        border2Ref={border2Ref}
        border4Ref={border4Ref}
        border6Ref={border6Ref}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-target`}>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            今日の +目標
          </span>
          <select
            id={`${idPrefix}-target`}
            name="target_plus"
            defaultValue={String(normalizePlusValue(defaultTargetPlus))}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {PLUS_SELECT_VALUES.map((n) => (
              <option key={n} value={n}>
                +{n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-actual`}>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            今日の +実績
          </span>
          <select
            id={`${idPrefix}-actual`}
            name="actual_plus"
            defaultValue={String(normalizePlusValue(defaultActualPlus))}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {PLUS_SELECT_VALUES.map((n) => (
              <option key={n} value={n}>
                +{n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 md:col-span-2" htmlFor={`${idPrefix}-event`}>
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          参加イベント
        </span>
        <select
          id={`${idPrefix}-event`}
          name="event_id"
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          defaultValue=""
        >
          <option value="">（未選択）</option>
          {events?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 md:col-span-2" htmlFor={`${idPrefix}-memo`}>
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          メモ
        </span>
        <textarea
          id={`${idPrefix}-memo`}
          name="memo"
          rows={2}
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="配信内容や気づきなどをメモできます。"
        />
      </label>

      <div className="flex items-center justify-between md:col-span-2">
        <label className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200">
          <input
            type="checkbox"
            name="skip_pass_used"
            className="h-3 w-3 rounded border-zinc-300 text-accent-500 focus:ring-accent-400 dark:border-zinc-600"
          />
          この日はスキップパスを使用した
        </label>
        <SubmitButton />
      </div>
    </form>
  );
}

