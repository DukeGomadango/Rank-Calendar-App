import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import {
  getOrCreateCalendarRankState,
  getRankCycleHistory,
  ensureSkipPassIncrementForLastWeek,
} from "@/lib/data/calendar-rank-state";
import { getSchedulesInRange } from "@/lib/data/schedules";
import { listEventsForCalendar } from "@/lib/data/events";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const calendarId = url.searchParams.get("calendarId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!calendarId || !from || !to) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const permissions = await getCalendarPermissionsForUser(calendarId, user.id);
  if (!permissions.canViewCalendar) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await ensureSkipPassIncrementForLastWeek(calendarId);

  const [entries, rankState, rankCycleHistory, schedules, events] = await Promise.all([
    getScheduleEntriesInRange(calendarId, from, to),
    getOrCreateCalendarRankState(calendarId),
    getRankCycleHistory(calendarId, from, to),
    getSchedulesInRange(calendarId, from, to),
    listEventsForCalendar(calendarId),
  ]);

  return NextResponse.json({
    entries,
    rankState,
    rankCycleHistory,
    schedules,
    events,
  });
}

