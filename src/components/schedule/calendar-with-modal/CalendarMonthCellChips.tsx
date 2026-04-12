import type { EventRow } from "@/lib/data/events";
import type { CalendarScheduleRow } from "@/lib/data/schedules";
import { getEventColorClasses } from "@/lib/event-colors";
import { formatScheduleTimeRangeLabel } from "./calendar-display-helpers";

export const MONTH_CELL_SCHEDULE_MAX = 2;

type Density = "compact" | "comfortable";

function scheduleKindPrefix(kind: string | null): string {
  if (kind === "personal") return "個・";
  if (kind === "secret") return "秘・";
  return "";
}

export function MonthEventChips(props: {
  events: EventRow[];
  dayDate: string;
  density: Density;
}) {
  const { events, dayDate, density } = props;
  if (events.length === 0) return null;
  const textSize = density === "compact" ? "text-[9px]" : "text-[10px]";
  const bleed = density === "compact" ? "" : "-mx-1.5";
  return (
    <div className={`mt-0.5 flex min-w-0 shrink-0 flex-col gap-px ${bleed}`}>
      {events.map((ev) => {
        const isStart = ev.start_date != null && ev.start_date === dayDate;
        const isEnd = ev.end_date != null && ev.end_date === dayDate;
        const { border, bg, text } = getEventColorClasses(ev.color ?? null);
        return (
          <div
            key={ev.id}
            className={`${bg} py-px font-medium line-clamp-1 ${textSize} ${text} ${isStart ? "rounded-l border-l-4 pl-1 " + border : "pl-0.5"} ${isEnd ? "rounded-r" : ""}`}
            title={ev.name}
          >
            {isStart ? ev.name : "\u00A0"}
          </div>
        );
      })}
    </div>
  );
}

function scheduleChipTitle(labelTime: string, prefix: string, title: string): string {
  const body = `${prefix}${title}`.trim();
  return body ? `${labelTime} ${body}` : labelTime;
}

export function MonthScheduleChips(props: {
  schedules: CalendarScheduleRow[];
  density: Density;
}) {
  const { schedules, density } = props;
  const visible = schedules.slice(0, MONTH_CELL_SCHEDULE_MAX);
  const overflow = schedules.length - visible.length;
  if (visible.length === 0) return null;

  const textSize = density === "compact" ? "text-[8px]" : "text-[9px]";
  const overflowSize = density === "compact" ? "text-[7px]" : "text-[8px]";
  const showInlineTime = density === "comfortable";

  const bleed = density === "compact" ? "" : "-mx-1.5";
  return (
    <div className={`mt-0.5 flex min-w-0 shrink-0 flex-col gap-px ${bleed}`}>
      {visible.map((s) => {
        const labelTime = formatScheduleTimeRangeLabel(s);
        const color = getEventColorClasses(s.color_id ?? null);
        const prefix = scheduleKindPrefix(s.kind);
        const tip = scheduleChipTitle(labelTime, prefix, s.title);
        return (
          <div
            key={s.id}
            className={`flex min-w-0 items-center gap-1 rounded-r py-px pl-1 font-medium line-clamp-1 ${textSize} ${color.leftBar} ${color.bg} ${color.text}`}
            title={tip}
          >
            {showInlineTime ? (
              <>
                <span className="shrink-0 tabular-nums">{labelTime}</span>
                <span className="min-w-0 flex-1 truncate">
                  {prefix}
                  {s.title}
                </span>
              </>
            ) : (
              <span className="min-w-0 flex-1 truncate">
                {prefix}
                {s.title}
              </span>
            )}
          </div>
        );
      })}
      {overflow > 0 && (
        <div className={`pl-1 ${overflowSize} text-zinc-500 dark:text-zinc-400`}>
          +{overflow}件
        </div>
      )}
    </div>
  );
}
