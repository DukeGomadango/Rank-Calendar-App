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

let lines = fs.readFileSync(extractPath, "utf8").split(/\r?\n/);
const idx = lines.findIndex((l) => l.includes("renderWeekGrid"));
if (idx < 0) throw new Error("renderWeekGrid not found");
lines.splice(idx, 1);
if (!lines[lines.length - 1].trim().startsWith("};")) throw new Error("bad end");
lines.pop();
const body = lines.map((l) => (l.startsWith("  ") ? l.slice(2) : l)).join("\n");

const header = `"use client";

import {
  Fragment,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import dayjs from "dayjs";
import {
  assignWeekColumnLayout,
  MINUTES_PER_DAY,
  snapMinutesToSlot,
  WEEK_VIEW_SLOT_MINUTES,
  type WeekViewSegment,
} from "@/lib/domain/week-view-layout";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { getRankBarDashedLineColorClass, getRankBarLineClass, getRankBarTextClass, getRankBarVerticalBorderClass } from "@/lib/rank-styles";
import { getEventColorClasses } from "@/lib/event-colors";
import { WeekScheduleBlockPopover } from "../WeekScheduleBlockPopover";
import {
  scheduleShowsInWeekAllDayRow,
  scheduleShowsInWeekTimeGrid,
} from "@/lib/domain/schedule-week-display";
import { WEEKDAYS, type PeriodType } from "./calendar-display-helpers";
import type { CycleInfoForDate, DayData } from "./types";

type ScheduleCreatePrefill =
  | null
  | { is_all_day: false; startTime: string; endTime: string; endDate: string };

type ScheduleCreateSelection =
  | null
  | { dayDate: string; startOffsetMinutes: number; endOffsetMinutes: number };

type ScheduleDragPreview = null | {
  columnDate: string;
  startTime: string;
  endTime: string;
};

type ScheduleResizePreview = null | {
  columnDate: string;
  scheduleId: string;
  startMs: number;
  endMs: number;
};

export type CalendarWeekGridProps = {
  weekTimeGridRef: RefObject<HTMLDivElement | null>;
  onWeekGridKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  permissions: CalendarPermissionFlags;
  currentRankCycle: { start: string; end: string; rank: string | null } | null;
  weekDays: DayData[];
  localDays: DayData[];
  eventsByDate: Map<string, EventRow[]>;
  schedulesByDate: Map<string, CalendarScheduleRow[]>;
  getCycleForDate: (date: string) => CycleInfoForDate;
  getBarRoundedInRow: (
    date: string,
    rowDates: string[],
    cycleStart: string,
    cycleEnd: string
  ) => { roundedLeft: boolean; roundedRight: boolean };
  getPeriodCellClass: (periodType: PeriodType, isToday: boolean) => string;
  formatCycleBandLabel: (rank: string | null, cycleStart?: string, cycleEnd?: string) => string;
  saveScheduleAction?: (formData: FormData) => Promise<unknown>;
  shiftScheduleAction?: (
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => Promise<void>;
  deleteScheduleAction?: (scheduleId: string) => Promise<void>;
  resizeScheduleAction?: (
    scheduleId: string,
    edge: "start" | "end",
    newDate: string,
    newTime: string
  ) => Promise<void>;
  selectedScheduleId: string | null;
  weekSchedulePreviewOpen: boolean;
  setWeekSchedulePreviewOpen: (v: boolean) => void;
  setSelectedDate: (d: string | null) => void;
  setSelectedScheduleId: (id: string | null) => void;
  setIsDayEditModalOpen: (v: boolean) => void;
  setModalTab: (t: "rank" | "schedule") => void;
  setScheduleCreatePrefill: Dispatch<SetStateAction<ScheduleCreatePrefill>>;
  setScheduleCreateSelection: Dispatch<SetStateAction<ScheduleCreateSelection>>;
  scheduleCreateSelection: ScheduleCreateSelection;
  scheduleCreateSelectionRef: MutableRefObject<ScheduleCreateSelection>;
  scheduleDragPreview: ScheduleDragPreview;
  setScheduleDragPreview: Dispatch<SetStateAction<ScheduleDragPreview>>;
  scheduleResizePreview: ScheduleResizePreview;
  setScheduleResizePreview: Dispatch<SetStateAction<ScheduleResizePreview>>;
  scheduleDragDurationMsRef: MutableRefObject<number>;
  scheduleShiftPendingRef: MutableRefObject<number>;
  applyOptimisticScheduleShift: (
    scheduleId: string,
    mode: "move" | "copy",
    newStartDate: string,
    newStartTime: string | null
  ) => { applied: boolean; rollback: () => void };
  applyOptimisticSchedulePatch: (
    scheduleId: string,
    next: CalendarScheduleRow
  ) => { applied: boolean; rollback: () => void };
  mutateRange: (
    data?: ((current: unknown) => unknown) | undefined,
    opts?: { revalidate?: boolean; populateCache?: boolean }
  ) => Promise<unknown>;
  showToast: (message: string) => void;
};

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
