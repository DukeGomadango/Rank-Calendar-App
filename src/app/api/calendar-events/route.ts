import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { listEventsForCalendar } from "@/lib/data/events";

type EventRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  color: string | null;
  event_type: string | null;
};

function eventsOnDate(events: EventRow[], date: string): EventRow[] {
  return events.filter((ev) => {
    const start = ev.start_date ?? ev.end_date;
    const end = ev.end_date ?? ev.start_date;
    if (start == null || end == null) return false;
    return start <= date && date <= end;
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const calendarId = url.searchParams.get("calendarId");
  const date = url.searchParams.get("date");

  if (!calendarId || !date) {
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

  // モーダル表示時だけ呼ばれる想定なので、まずはカレンダー全イベントを取り、
  // UIと同じロジックで日付でフィルタリングする。
  const allEvents = await listEventsForCalendar(calendarId);
  const events = eventsOnDate(allEvents as EventRow[], date);

  return NextResponse.json({ events });
}

