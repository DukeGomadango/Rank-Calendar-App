"use client";

import { MantineProvider, Popover } from "@mantine/core";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { NoteIcon, TrashIcon } from "@/components/icons/DashboardIcons";

export type WeekScheduleBlockPopoverProps = {
  opened: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: CalendarScheduleRow;
  timeLabel: string;
  memoPreview: string | null;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  children: React.ReactNode;
};

export function WeekScheduleBlockPopover({
  opened,
  onOpenChange,
  schedule,
  timeLabel,
  memoPreview,
  canDelete,
  onEdit,
  onDelete,
  children,
}: WeekScheduleBlockPopoverProps) {
  return (
    <MantineProvider>
      <Popover
        opened={opened}
        onChange={onOpenChange}
        position="right-start"
        shadow="md"
        radius="md"
        trapFocus={false}
      >
        <Popover.Target>{children}</Popover.Target>
        <Popover.Dropdown
          className="border border-zinc-200 bg-white p-2 text-[11px] dark:border-zinc-600 dark:bg-zinc-900"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {schedule.title || "（無題）"}
          </p>
          <p className="mt-0.5 tabular-nums text-zinc-500 dark:text-zinc-400">{timeLabel}</p>
          {memoPreview ? (
            <p className="mt-1 flex items-start gap-1 line-clamp-3 text-[10px] text-zinc-600 dark:text-zinc-300">
              <NoteIcon className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span>{memoPreview}</span>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-md bg-accent-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400"
              aria-label="予定を編集"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              編集
            </button>
            {canDelete ? (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 rounded-md border border-zinc-300 px-2 py-1 text-[10px] text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                aria-label="予定を削除"
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete();
                }}
              >
                <TrashIcon className="h-3 w-3" aria-hidden />
                削除
              </button>
            ) : null}
          </div>
        </Popover.Dropdown>
      </Popover>
    </MantineProvider>
  );
}
