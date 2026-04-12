import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src/components/schedule/CalendarWithModal.tsx");
const lines = fs.readFileSync(src, "utf8").split(/\r?\n/);

// 0-based inclusive slices from ORIGINAL file (before we modify)
// export line 177 → index 176; detailRowForModal の閉じ直後まで（次行が DayScheduleForm の type）
const a = lines.slice(176, 924).join("\n");

// getBarRounded through streamTimeTotals (0-based: 1187..1330)
const b = lines.slice(1187, 1331).join("\n");

// scheduleClipboardRef through dragend effect: 1635-1751
const c = lines.slice(1634, 1751).join("\n");

const header = `"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/ja";

import type { ScheduleEntryRow } from "@/lib/data/schedule-entries";
import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { useToast } from "@/lib/toast-context";
import { toJstDateString } from "@/lib/domain/calendar";
import { useViewMode } from "@/lib/view-mode-context";
import { useDashboardCalendar } from "@/components/dashboard/DashboardProvider";
import { DayDetailModal, type DayDetailRow } from "@/components/data/DayDetailModal";
import {
  dateInCycle,
  getPeriodType,
  WEEKDAYS,
  type PeriodType,
} from "./calendar-with-modal/calendar-display-helpers";
import type { CalendarWithModalProps, DayData } from "./calendar-with-modal/types";
import { CalendarToolbar } from "./calendar-with-modal/CalendarToolbar";
import { CalendarMonthGrid } from "./calendar-with-modal/CalendarMonthGrid";
import { CalendarWeekGrid } from "./calendar-with-modal/CalendarWeekGrid";
import { CalendarDayEditSheet } from "./calendar-with-modal/CalendarDayEditSheet";

dayjs.locale("ja");

`;

const footer = `
      {moveError && (
        <div
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {moveError}
        </div>
      )}

      {permissions.canEditSchedule && isDayEditModalOpen && selectedDate && selectedDay && (
        <CalendarDayEditSheet
          sheetEntered={sheetEntered}
          selectedDate={selectedDate}
          selectedDay={selectedDay}
          calendarId={calendarId}
          events={events}
          skipPassRemaining={skipPassRemaining}
          handleSave={handleSave}
          effectiveDefaultEventId={effectiveDefaultEventId}
          modalTab={modalTab}
          setModalTab={setModalTab}
          saveScheduleAction={saveScheduleAction}
          selectedSchedule={selectedSchedule}
          scheduleCreatePrefill={scheduleCreatePrefill}
          selectedSchedules={selectedSchedules}
          selectedScheduleId={selectedScheduleId}
          setSelectedScheduleId={setSelectedScheduleId}
          setScheduleCreatePrefill={setScheduleCreatePrefill}
          permissions={permissions}
          deleteScheduleAction={deleteScheduleAction}
          onClose={() => {
            setSelectedDate(null);
            setSelectedScheduleId(null);
            setScheduleCreatePrefill(null);
            setScheduleCreateSelection(null);
            setIsDayEditModalOpen(false);
            setWeekSchedulePreviewOpen(false);
          }}
        />
      )}

      {!permissions.canEditSchedule && selectedDate && selectedDay && detailRowForModal && (
        <DayDetailModal
          row={detailRowForModal}
          events={events}
          schedulesForDay={selectedSchedules}
          permissions={permissions}
          calendarId={calendarId}
          onClose={() => {
            setSelectedDate(null);
            setSelectedScheduleId(null);
            setScheduleCreatePrefill(null);
            setScheduleCreateSelection(null);
            setIsDayEditModalOpen(false);
            setWeekSchedulePreviewOpen(false);
          }}
        />
      )}
    </div>
  );
}
`;

const middle = `
      <CalendarToolbar
        monthLabel={monthLabel}
        calendarName={calendarName}
        view={view}
        onViewChange={setView}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isNavigating={isNavigating}
        prevMonthParam={prevMonthParam}
        nextMonthParam={nextMonthParam}
        prevWeekMonth={prevWeekMonth}
        prevWeekStart={prevWeekStart}
        nextWeekMonth={nextWeekMonth}
        nextWeekStart={nextWeekStart}
        onGoToMonth={goToMonth}
        onGoToWeek={goToWeek}
      />

      {view === "week" ? (
        <CalendarWeekGrid
          weekTimeGridRef={weekTimeGridRef}
          onWeekGridKeyDown={handleWeekGridKeyDown}
          permissions={permissions}
          currentRankCycle={currentRankCycle}
          weekDays={weekDays}
          localDays={localDays}
          eventsByDate={eventsByDate}
          schedulesByDate={schedulesByDate}
          getCycleForDate={getCycleForDate}
          getBarRoundedInRow={getBarRoundedInRow}
          getPeriodCellClass={getPeriodCellClass}
          formatCycleBandLabel={formatCycleBandLabel}
          saveScheduleAction={saveScheduleAction}
          shiftScheduleAction={shiftScheduleAction}
          deleteScheduleAction={deleteScheduleAction}
          resizeScheduleAction={resizeScheduleAction}
          selectedScheduleId={selectedScheduleId}
          weekSchedulePreviewOpen={weekSchedulePreviewOpen}
          setWeekSchedulePreviewOpen={setWeekSchedulePreviewOpen}
          setSelectedDate={setSelectedDate}
          setSelectedScheduleId={setSelectedScheduleId}
          setIsDayEditModalOpen={setIsDayEditModalOpen}
          setModalTab={setModalTab}
          setScheduleCreatePrefill={setScheduleCreatePrefill}
          setScheduleCreateSelection={setScheduleCreateSelection}
          scheduleCreateSelection={scheduleCreateSelection}
          scheduleCreateSelectionRef={scheduleCreateSelectionRef}
          scheduleDragPreview={scheduleDragPreview}
          setScheduleDragPreview={setScheduleDragPreview}
          scheduleResizePreview={scheduleResizePreview}
          setScheduleResizePreview={setScheduleResizePreview}
          scheduleDragDurationMsRef={scheduleDragDurationMsRef}
          scheduleShiftPendingRef={scheduleShiftPendingRef}
          applyOptimisticScheduleShift={applyOptimisticScheduleShift}
          applyOptimisticSchedulePatch={applyOptimisticSchedulePatch}
          mutateRange={mutateRange}
          showToast={showToast}
        />
      ) : (
        <CalendarMonthGrid
          permissions={permissions}
          viewMode={viewMode}
          streamTimeTotals={streamTimeTotals}
          monthWeeks={monthWeeks}
          todayStr={todayStr}
          eventsByDate={eventsByDate}
          schedulesByDate={schedulesByDate}
          getCycleForDate={getCycleForDate}
          getBarRoundedInRow={getBarRoundedInRow}
          getPeriodCellClass={getPeriodCellClass}
          formatCycleBandLabel={formatCycleBandLabel}
          onMonthDayActivate={(day) => {
            setSelectedDate(day.date);
            if (permissions.canEditSchedule) {
              setIsDayEditModalOpen(true);
              setWeekSchedulePreviewOpen(false);
            }
          }}
          onMoveEntryToDate={handleMoveEntry}
        />
      )}
`;

// Patch `}: Props)` -> `}: CalendarWithModalProps)`
const patchedA = a.replace("}: Props)", "}: CalendarWithModalProps)");

let out = header + patchedA + "\n" + b + "\n" + c + "\n" + middle + "\n" + footer;
out = out.replace(
  /async \(e: React\.KeyboardEvent<HTMLElement>\)/g,
  "async (e: ReactKeyboardEvent<HTMLElement>)"
);

const openReturn = `

  return (
    <div className="space-y-4">
`;
out = out.replace(/\},\s*\[\]\);\s*\n\s*<CalendarToolbar/s, `}, []);${openReturn}      <CalendarToolbar`);

fs.writeFileSync(src, out);
console.log("assembled", src, "lines", out.split("\n").length);
