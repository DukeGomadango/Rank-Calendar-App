/**
 * ダッシュボード関連の Server Action は、このファイル経由で値を再エクスポートしない。
 * Turbopack ではバレル経由の Action を RSC から Client に渡すと ID 解決が壊れることがあるため、
 * 各アクションは定義元（schedule-entry-actions / calendar-schedule-actions / rank-actions）から直接 import する。
 */
export type { SaveScheduleEntryResult } from "@/lib/validations/schedule";
export type { SaveCalendarScheduleResult } from "./calendar-schedule-actions";
