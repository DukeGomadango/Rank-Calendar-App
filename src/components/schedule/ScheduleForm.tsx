"use client";

import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { BorderOcrButton } from "@/components/ocr/BorderOcrButton";
import { EVENT_PALETTE } from "@/lib/event-colors";
import { PLUS_SELECT_VALUES, normalizePlusValue } from "@/lib/plus-options";

type ScheduleFormProps = {
  calendarId: string;
  defaultDate: string;
  action: (formData: FormData) => void | Promise<void>;
  events?: { id: string; name: string }[];
  defaultTargetPlus?: number | null;
  defaultActualPlus?: number | null;
  /** あんしんランクスコア（アンスコ）の基準値。+2確定の目安。 */
  defaultAnsukoBaseline?: number | null;
  defaultBorderPlus2?: number | null;
  defaultBorderPlus4?: number | null;
  defaultBorderPlus6?: number | null;
  defaultEventId?: string | null;
  defaultMemo?: string | null;
  defaultSkipPassUsed?: boolean;
  /** スキパ残り枚数。渡すとラベルに「(残りn枚)」を表示。データタブと連携用。 */
  skipPassRemaining?: number;
  defaultStreamContent?: string | null;
  defaultStreamContentColor?: string | null;
};

function SubmitButton({ isSubmitting }: { isSubmitting?: boolean }) {
  const { pending } = useFormStatus();
  const loading = isSubmitting ?? pending;
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-xl bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 focus:ring-offset-zinc-50 disabled:opacity-60 dark:focus:ring-offset-zinc-900"
    >
      {loading ? "保存中..." : "保存する"}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
      {children}
    </span>
  );
}

export function ScheduleForm({
  calendarId,
  defaultDate,
  action,
  events,
  defaultTargetPlus,
  defaultActualPlus,
  defaultAnsukoBaseline,
  defaultBorderPlus2,
  defaultBorderPlus4,
  defaultBorderPlus6,
  defaultEventId,
  defaultMemo,
  defaultSkipPassUsed = false,
  skipPassRemaining,
  defaultStreamContent,
  defaultStreamContentColor,
}: ScheduleFormProps) {
  const idPrefix = useId();
  const border2Ref = useRef<HTMLInputElement | null>(null);
  const border4Ref = useRef<HTMLInputElement | null>(null);
  const border6Ref = useRef<HTMLInputElement | null>(null);
  const [skipPassUsed, setSkipPassUsed] = useState(defaultSkipPassUsed);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await action(new FormData(e.currentTarget));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="calendar_id" value={calendarId} />

      {/* 日付 ＋ スキップパス（同一行） */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-date`}>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            日付
          </span>
          <input
            id={`${idPrefix}-date`}
            type="date"
            name="date"
            defaultValue={defaultDate}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 sm:pb-0.5">
          <input
            type="checkbox"
            name="skip_pass_used"
            checked={skipPassUsed}
            onChange={(e) => setSkipPassUsed(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 text-accent-500 focus:ring-accent-400 dark:border-zinc-600"
          />
          <span className="text-[11px] text-zinc-700 dark:text-zinc-200">
            スキップパスを使用する
            {skipPassRemaining != null && ` (残り${skipPassRemaining}枚)`}
          </span>
        </label>
      </div>

      {/* 配信内容（歌枠・雑談等）＋ 左線の色 */}
      <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-slate-600 dark:bg-slate-900/50">
        <GroupLabel>配信内容</GroupLabel>
        <input
          type="text"
          name="stream_content"
          defaultValue={defaultStreamContent ?? ""}
          placeholder="歌枠・雑談・パネルあけなど"
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">左線の色</span>
          <div className="flex flex-wrap gap-1">
            {EVENT_PALETTE.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-0.5">
                <input
                  type="radio"
                  name="stream_content_color"
                  value={c.id}
                  defaultChecked={(defaultStreamContentColor ?? "") === c.id || (!defaultStreamContentColor && c.id === "rose")}
                  className="sr-only peer"
                />
                <span
                  className={`block h-5 w-5 rounded border-2 border-transparent peer-checked:border-zinc-800 peer-checked:ring-1 peer-checked:ring-zinc-600 dark:peer-checked:border-zinc-200 ${c.swatch}`}
                  title={c.label}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 【アンスコ・ボーダー】＋ OCR（最上部で目立たせる） */}
      <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-slate-600 dark:bg-slate-900/50">
        <GroupLabel>アンスコ・ボーダー</GroupLabel>
        <BorderOcrButton
          border2Ref={border2Ref}
          border4Ref={border4Ref}
          border6Ref={border6Ref}
        />
        <div className="grid grid-cols-4 gap-2">
          <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-ansuko`}>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              アンスコ
            </span>
            <input
              id={`${idPrefix}-ansuko`}
              type="number"
              name="ansuko_baseline"
              min={0}
              defaultValue={defaultAnsukoBaseline ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-border2`}>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              +2
            </span>
            <input
              id={`${idPrefix}-border2`}
              type="number"
              name="border_plus2"
              min={0}
              ref={border2Ref}
              defaultValue={defaultBorderPlus2 ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-border4`}>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              +4
            </span>
            <input
              id={`${idPrefix}-border4`}
              type="number"
              name="border_plus4"
              min={0}
              ref={border4Ref}
              defaultValue={defaultBorderPlus4 ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-border6`}>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              +6
            </span>
            <input
              id={`${idPrefix}-border6`}
              type="number"
              name="border_plus6"
              min={0}
              ref={border6Ref}
              defaultValue={defaultBorderPlus6 ?? ""}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
            />
          </label>
        </div>
      </div>

      {/* 【目標と実績】スキップ時は非活性＋hidden で 0 を送信 */}
      <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-slate-600 dark:bg-slate-900/50">
        <GroupLabel>目標と実績</GroupLabel>
        {skipPassUsed && (
          <>
            <input type="hidden" name="target_plus" value="0" />
            <input type="hidden" name="actual_plus" value="0" />
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-target`}>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              今日の +目標
            </span>
            <select
              id={`${idPrefix}-target`}
              name="target_plus"
              defaultValue={String(normalizePlusValue(defaultTargetPlus))}
              disabled={skipPassUsed}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50 dark:disabled:bg-slate-800"
            >
              {PLUS_SELECT_VALUES.map((n) => (
                <option key={n} value={n}>
                  +{n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-actual`}>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              今日の +実績
            </span>
            <select
              id={`${idPrefix}-actual`}
              name="actual_plus"
              defaultValue={String(normalizePlusValue(defaultActualPlus))}
              disabled={skipPassUsed}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50 dark:disabled:bg-slate-800"
            >
              {PLUS_SELECT_VALUES.map((n) => (
                <option key={n} value={n}>
                  +{n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {skipPassUsed && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            スキップパス使用日は目標・実績を記録しません。
          </p>
        )}
      </div>

      {/* 【その他】イベント・メモ */}
      <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-slate-600 dark:bg-slate-900/50">
        <GroupLabel>その他</GroupLabel>
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-event`}>
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
            参加イベント
          </span>
          <select
            id={`${idPrefix}-event`}
            name="event_id"
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
            defaultValue={defaultEventId ?? ""}
          >
            <option value="">（未選択）</option>
            {events?.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1" htmlFor={`${idPrefix}-memo`}>
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
            メモ
          </span>
          <textarea
            id={`${idPrefix}-memo`}
            name="memo"
            rows={2}
            defaultValue={defaultMemo ?? ""}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-50"
            placeholder="配信内容や気づきなどをメモできます。"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}
