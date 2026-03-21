"use client";

import { useEffect, useState } from "react";
import type { EventRow } from "@/lib/data/events";

type Args = {
  calendarId: string | undefined;
  canViewEvents: boolean;
  /** 親から既に渡っている場合は取得しない */
  initialEvents: EventRow[];
  rowDate: string;
};

/**
 * データタブなどで events を同梱しない場合、モーダル表示中にその日のイベントだけ取得する。
 */
export function useDayDetailEvents({
  calendarId,
  canViewEvents,
  initialEvents,
  rowDate,
}: Args): { eventsState: EventRow[] } {
  const [eventsState, setEventsState] = useState<EventRow[]>(initialEvents);
  const [eventsLoadedFor, setEventsLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    setEventsState(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (!calendarId) return;
    if (!canViewEvents) return;
    if (initialEvents.length > 0) return;
    if (eventsLoadedFor === rowDate) return;

    let cancelled = false;
    const date = rowDate;

    (async () => {
      try {
        const res = await fetch(
          `/api/calendar-events?calendarId=${encodeURIComponent(calendarId)}&date=${encodeURIComponent(
            date
          )}`,
          { method: "GET" }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { events?: EventRow[] };
        if (cancelled) return;
        setEventsState((json.events ?? []) as EventRow[]);
        setEventsLoadedFor(date);
      } catch {
        // 失敗しても編集体験を止めない
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calendarId, canViewEvents, initialEvents.length, eventsLoadedFor, rowDate]);

  return { eventsState };
}
