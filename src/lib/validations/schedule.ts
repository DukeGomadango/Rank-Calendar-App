import { z } from "zod";

import { MAX_BORDER_VALUE } from "@/lib/border-constants";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください");

const preprocessNullableNumber = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return null;
  return Math.floor(n);
};

const optionalPlusValue = z.preprocess(
  preprocessNullableNumber,
  z.union([
    z
      .number()
      .int()
      .min(0, "値は0以上で入力してください")
      .max(9_999, "値は9,999まで入力できます"),
    z.null(),
  ])
);

const optionalBorderValue = z.preprocess(
  preprocessNullableNumber,
  z.union([
    z
      .number()
      .int()
      .min(0, "値は0以上で入力してください")
      .max(
        MAX_BORDER_VALUE,
        "ボーダー・アンスコ基準値は9,999万（99,990,000）まで入力できます"
      ),
    z.null(),
  ])
);

const optionalUuid = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .refine((v): v is string | null => v === null || /^[0-9a-f-]{36}$/i.test(v), "不正なIDです");

export const saveScheduleEntrySchema = z.object({
  calendar_id: z.string().uuid("カレンダーIDが不正です"),
  date: dateString,
  ansuko_baseline: optionalBorderValue,
  border_plus2: optionalBorderValue,
  border_plus4: optionalBorderValue,
  border_plus6: optionalBorderValue,
  target_plus: optionalPlusValue,
  actual_plus: optionalPlusValue,
  skip_pass_used: z
    .enum(["on", ""])
    .optional()
    .transform((v) => v === "on"),
  memo: z
    .string()
    .max(1000, "メモは1000文字以内で入力してください")
    .optional()
    .transform((s) =>
      s === undefined || (typeof s === "string" && s.trim() === "") ? null : s.trim()
    )
    .nullable(),
  event_id: z.optional(optionalUuid).transform((v) => v ?? null),
  stream_content: z
    .string()
    .max(500, "配信内容は500文字以内で入力してください")
    .optional()
    .transform((s) =>
      s === undefined || (typeof s === "string" && s.trim() === "") ? null : s.trim()
    )
    .nullable(),
  stream_content_color: z
    .string()
    .max(20)
    .optional()
    .transform((s) =>
      s === undefined || (typeof s === "string" && s.trim() === "") ? null : s.trim()
    )
    .nullable(),
});

export type SaveScheduleEntryInput = z.infer<typeof saveScheduleEntrySchema>;

export type SaveScheduleEntryResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };
