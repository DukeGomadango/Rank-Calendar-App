import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import {
  listEventsForCalendarOverlappingRange,
  type EventRow,
} from "@/lib/data/events";
import { addDays, toJstDateString } from "@/lib/domain/calendar";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const calendarId = url.searchParams.get("calendarId");
  const mode = url.searchParams.get("mode");

  if (!calendarId || (mode !== "active" && mode !== "past")) {
    return NextResponse.json({ error: "missing/invalid params" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const permissions = await getCalendarPermissionsForUser(calendarId, user.id);
  if (!permissions.canViewEvents) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const today = toJstDateString(new Date());

  const eventsPromise =
    mode === "active"
      ? listEventsForCalendarOverlappingRange(calendarId, today, "9999-12-31")
      : listEventsForCalendarOverlappingRange(
          calendarId,
          "1900-01-01",
          addDays(today, -1)
        );

  const events = await eventsPromise;

  // 既存の splitActivePast の順序に寄せる（start asc / past is end desc）
  if (mode === "active") {
    (events as EventRow[]).sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  } else {
    const getEnd = (e: EventRow) => e.end_date ?? e.start_date ?? "";
    (events as EventRow[]).sort((a, b) => getEnd(b).localeCompare(getEnd(a)));
  }

  return NextResponse.json({ events });
}

