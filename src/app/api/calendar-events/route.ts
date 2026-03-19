import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { listEventsForCalendarOnDate } from "@/lib/data/events";

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

  const events = await listEventsForCalendarOnDate(calendarId, date);

  return NextResponse.json({ events });
}

