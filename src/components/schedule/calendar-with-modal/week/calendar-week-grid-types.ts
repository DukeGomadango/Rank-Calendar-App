import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { KeyedMutator } from "swr";

import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import type { CalendarRangeResponse } from "@/lib/hooks/useCalendarRange";
import type { PeriodType } from "../calendar-display-helpers";
import type { CycleInfoForDate, DayData } from "../types";

export type ScheduleCreatePrefill =
  | null
  | { is_all_day: false; startTime: string; endTime: string; endDate: string };

export type ScheduleCreateSelection =
  | null
  | { dayDate: string; startOffsetMinutes: number; endOffsetMinutes: number };

export type ScheduleDragPreview = null | {
  columnDate: string;
  startTime: string;
  endTime: string;
};

export type ScheduleResizePreview = null | {
  columnDate: string;
  scheduleId: string;
  startMs: number;
  endMs: number;
};

export type CalendarWeekGridProps = {
  weekTimeGridRef: RefObject<HTMLDivElement | null>;
  onWeekGridKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
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
  mutateRange: KeyedMutator<CalendarRangeResponse>;
  showToast: (message: string) => void;
};
