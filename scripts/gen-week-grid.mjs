/**
 * `_week_extract.txt` から週グリッド本体（return より上のロジック＋ JSX）を読み込み、
 * `CalendarWeekGrid.tsx` を再生成する。
 *
 * 期待する `_week_extract.txt` の形:
 * - 先頭付近に `renderWeekGrid` を含む行が1行ある（その行は削除される）
 * - 末尾がコンポーネント関数の閉じ `};` なら削除される
 * - 残りは元ファイルで2スペースインデントされていた想定（先頭2文字を削ってフラット化）
 *
 * `week/calendar-week-grid-types.ts` と `week/weekGridTimeHelpers.ts` はこのスクリプトでは上書きしない。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const extractPath = path.join(
  root,
  "src/components/schedule/calendar-with-modal/_week_extract.txt"
);
const outPath = path.join(
  root,
  "src/components/schedule/calendar-with-modal/CalendarWeekGrid.tsx"
);

if (!fs.existsSync(extractPath)) {
  console.error(
    "Missing:",
    extractPath,
    "\nCreate it from the inner body of CalendarWeekGrid (see script header comment)."
  );
  process.exit(1);
}

let lines = fs.readFileSync(extractPath, "utf8").split(/\r?\n/);
const idx = lines.findIndex((l) => l.includes("renderWeekGrid"));
if (idx < 0) throw new Error("renderWeekGrid not found in _week_extract.txt");
lines.splice(idx, 1);
if (!lines[lines.length - 1].trim().startsWith("};")) throw new Error("bad end: expected last line to be };");
lines.pop();
const body = lines.map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n");

const header = `"use client";

import { Fragment, useMemo } from "react";
import dayjs from "dayjs";
import {
  assignWeekColumnLayout,
  MINUTES_PER_DAY,
  WEEK_VIEW_SLOT_MINUTES,
  type WeekViewSegment,
} from "@/lib/domain/week-view-layout";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { getRankBarDashedLineColorClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { getEventColorClasses } from "@/lib/event-colors";
import { WeekScheduleBlockPopover } from "../WeekScheduleBlockPopover";
import {
  scheduleShowsInWeekAllDayRow,
  scheduleShowsInWeekTimeGrid,
} from "@/lib/domain/schedule-week-display";
import { WEEKDAYS } from "./calendar-display-helpers";
import type { CalendarWeekGridProps } from "./week/calendar-week-grid-types";
import { createWeekGridTimeHelpers } from "./week/weekGridTimeHelpers";

export type {
  CalendarWeekGridProps,
  ScheduleCreatePrefill,
  ScheduleCreateSelection,
  ScheduleDragPreview,
  ScheduleResizePreview,
} from "./week/calendar-week-grid-types";

export function CalendarWeekGrid(props: CalendarWeekGridProps) {
  const {
    weekTimeGridRef,
    onWeekGridKeyDown,
    permissions,
    currentRankCycle,
    weekDays,
    localDays,
    eventsByDate,
    schedulesByDate,
    getCycleForDate,
    getBarRoundedInRow,
    getPeriodCellClass,
    formatCycleBandLabel,
    saveScheduleAction,
    shiftScheduleAction,
    deleteScheduleAction,
    resizeScheduleAction,
    selectedScheduleId,
    weekSchedulePreviewOpen,
    setWeekSchedulePreviewOpen,
    setSelectedDate,
    setSelectedScheduleId,
    setIsDayEditModalOpen,
    setModalTab,
    setScheduleCreatePrefill,
    setScheduleCreateSelection,
    scheduleCreateSelection,
    scheduleCreateSelectionRef,
    scheduleDragPreview,
    setScheduleDragPreview,
    scheduleResizePreview,
    setScheduleResizePreview,
    scheduleDragDurationMsRef,
    scheduleShiftPendingRef,
    applyOptimisticScheduleShift,
    applyOptimisticSchedulePatch,
    mutateRange,
    showToast,
  } = props;


`;

fs.writeFileSync(outPath, `${header}${body}\n}\n`);
console.log("wrote", outPath);
