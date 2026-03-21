"use client";

import dayjs from "dayjs";
import "dayjs/locale/ja";

import { DayDetailModal } from "@/components/data/DayDetailModal";
import type { CalendarWithModalProps } from "./calendar-with-modal/types";
import { CalendarToolbar } from "./calendar-with-modal/CalendarToolbar";
import { CalendarMonthGrid } from "./calendar-with-modal/CalendarMonthGrid";
import { CalendarWeekGrid } from "./calendar-with-modal/CalendarWeekGrid";
import { CalendarDayEditSheet } from "./calendar-with-modal/CalendarDayEditSheet";
import { useCalendarWithModalLogic } from "./calendar-with-modal/useCalendarWithModalLogic";

dayjs.locale("ja");

export function CalendarWithModal(props: CalendarWithModalProps) {
  const m = useCalendarWithModalLogic(props);

  return (
    <div className="space-y-4">
      <CalendarToolbar
        monthLabel={m.monthLabel}
        calendarName={m.calendarName}
        view={m.view}
        onViewChange={m.setView}
        viewMode={m.viewMode}
        onViewModeChange={m.setViewMode}
        isNavigating={m.isNavigating}
        prevMonthParam={m.prevMonthParam}
        nextMonthParam={m.nextMonthParam}
        prevWeekMonth={m.prevWeekMonth}
        prevWeekStart={m.prevWeekStart}
        nextWeekMonth={m.nextWeekMonth}
        nextWeekStart={m.nextWeekStart}
        onGoToMonth={m.goToMonth}
        onGoToWeek={m.goToWeek}
      />

      {m.view === "week" ? (
        <CalendarWeekGrid
          weekTimeGridRef={m.weekTimeGridRef}
          onWeekGridKeyDown={m.handleWeekGridKeyDown}
          permissions={m.permissions}
          currentRankCycle={m.currentRankCycle}
          weekDays={m.weekDays}
          localDays={m.localDays}
          eventsByDate={m.eventsByDate}
          schedulesByDate={m.schedulesByDate}
          getCycleForDate={m.getCycleForDate}
          getBarRoundedInRow={m.getBarRoundedInRow}
          getPeriodCellClass={m.getPeriodCellClass}
          formatCycleBandLabel={m.formatCycleBandLabel}
          saveScheduleAction={m.saveScheduleAction}
          shiftScheduleAction={m.shiftScheduleAction}
          deleteScheduleAction={m.deleteScheduleAction}
          resizeScheduleAction={m.resizeScheduleAction}
          selectedScheduleId={m.selectedScheduleId}
          weekSchedulePreviewOpen={m.weekSchedulePreviewOpen}
          setWeekSchedulePreviewOpen={m.setWeekSchedulePreviewOpen}
          setSelectedDate={m.setSelectedDate}
          setSelectedScheduleId={m.setSelectedScheduleId}
          setIsDayEditModalOpen={m.setIsDayEditModalOpen}
          setModalTab={m.setModalTab}
          setScheduleCreatePrefill={m.setScheduleCreatePrefill}
          setScheduleCreateSelection={m.setScheduleCreateSelection}
          scheduleCreateSelection={m.scheduleCreateSelection}
          scheduleCreateSelectionRef={m.scheduleCreateSelectionRef}
          scheduleDragPreview={m.scheduleDragPreview}
          setScheduleDragPreview={m.setScheduleDragPreview}
          scheduleResizePreview={m.scheduleResizePreview}
          setScheduleResizePreview={m.setScheduleResizePreview}
          scheduleDragDurationMsRef={m.scheduleDragDurationMsRef}
          scheduleShiftPendingRef={m.scheduleShiftPendingRef}
          applyOptimisticScheduleShift={m.applyOptimisticScheduleShift}
          applyOptimisticSchedulePatch={m.applyOptimisticSchedulePatch}
          mutateRange={m.mutateRange}
          showToast={m.showToast}
        />
      ) : (
        <CalendarMonthGrid
          permissions={m.permissions}
          viewMode={m.viewMode}
          streamTimeTotals={m.streamTimeTotals}
          monthWeeks={m.monthWeeks}
          todayStr={m.todayStr}
          eventsByDate={m.eventsByDate}
          schedulesByDate={m.schedulesByDate}
          getCycleForDate={m.getCycleForDate}
          getBarRoundedInRow={m.getBarRoundedInRow}
          getPeriodCellClass={m.getPeriodCellClass}
          formatCycleBandLabel={m.formatCycleBandLabel}
          onMonthDayActivate={m.onMonthDayActivate}
          onMoveEntryToDate={m.handleMoveEntry}
        />
      )}

      {m.moveError && (
        <div
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {m.moveError}
        </div>
      )}

      {m.permissions.canEditSchedule &&
        m.isDayEditModalOpen &&
        m.selectedDate &&
        m.selectedDay && (
          <CalendarDayEditSheet
            sheetEntered={m.sheetEntered}
            selectedDate={m.selectedDate}
            selectedDay={m.selectedDay}
            calendarId={m.calendarId}
            events={m.events}
            skipPassRemaining={m.skipPassRemaining}
            handleSave={m.handleSave}
            effectiveDefaultEventId={m.effectiveDefaultEventId}
            modalTab={m.modalTab}
            setModalTab={m.setModalTab}
            saveScheduleAction={m.saveScheduleAction}
            selectedSchedule={m.selectedSchedule}
            scheduleCreatePrefill={m.scheduleCreatePrefill}
            selectedSchedules={m.selectedSchedules}
            selectedScheduleId={m.selectedScheduleId}
            setSelectedScheduleId={m.setSelectedScheduleId}
            setScheduleCreatePrefill={m.setScheduleCreatePrefill}
            permissions={m.permissions}
            deleteScheduleAction={m.deleteScheduleAction}
            onClose={m.onCloseModals}
          />
        )}

      {!m.permissions.canEditSchedule &&
        m.selectedDate &&
        m.selectedDay &&
        m.detailRowForModal && (
          <DayDetailModal
            row={m.detailRowForModal}
            events={m.events}
            permissions={m.permissions}
            calendarId={m.calendarId}
            onClose={m.onCloseModals}
          />
        )}
    </div>
  );
}
