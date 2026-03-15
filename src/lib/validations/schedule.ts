import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください");
const optionalNumber = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isNaN(n) ? null : Math.max(0, Math.min(999, Math.floor(n)));
  })
  .nullable();
const optionalUuid = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .refine((v): v is string | null => v === null || /^[0-9a-f-]{36}$/i.test(v), "不正なIDです");

export const saveScheduleEntrySchema = z.object({
  calendar_id: z.string().uuid("カレンダーIDが不正です"),
  date: dateString,
  ansuko_baseline: optionalNumber,
  border_plus2: optionalNumber,
  border_plus4: optionalNumber,
  border_plus6: optionalNumber,
  target_plus: optionalNumber,
  actual_plus: optionalNumber,
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
