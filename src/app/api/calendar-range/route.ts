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
import {
  listEventsForCalendarOverlappingRange,
  type EventRow,
} from "@/lib/data/events";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const calendarId = url.searchParams.get("calendarId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const includeEventsParam = url.searchParams.get("includeEvents");
  const includeEvents =
    includeEventsParam == null
      ? true
      : includeEventsParam !== "0" && includeEventsParam !== "false";

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

  // `skip_pass_remaining` を表示/利用するのはカレンダー側なので、データタブ(`includeEvents=false`)では GET のたびに不要な計算を走らせない。
  if (includeEvents && permissions.canViewRank) {
    await ensureSkipPassIncrementForLastWeek(calendarId);
  }

  const entriesPromise = getScheduleEntriesInRange(calendarId, from, to, {
    includeBorders: permissions.canViewBorders,
    includeMemo: permissions.canViewMemo,
    // listener の「今日の予定」等で使うテキスト（グリッドの色ドットは色のみ）
    includeStreamContent: permissions.canViewEvents,
  });

  const rankStatePromise = permissions.canViewRank
    ? getOrCreateCalendarRankState(calendarId)
    : Promise.resolve(null);

  const rankCycleHistoryPromise = permissions.canViewRank
    ? getRankCycleHistory(calendarId, from, to)
    : Promise.resolve([]);

  const eventsPromise: Promise<EventRow[]> =
    includeEvents && permissions.canViewEvents
      ? listEventsForCalendarOverlappingRange(calendarId, from, to)
      : Promise.resolve([]);

  const [entries, rankState, rankCycleHistory, schedules, events] = await Promise.all([
    entriesPromise,
    rankStatePromise,
    rankCycleHistoryPromise,
    getSchedulesInRange(calendarId, from, to),
    eventsPromise,
  ]);

  return NextResponse.json({
    entries,
    rankState,
    rankCycleHistory,
    schedules,
    events,
  });
}

