import dayjs from "dayjs";
import "dayjs/locale/ja";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar, type EventRow } from "@/lib/data/events";
import { getMockEvents } from "@/lib/mock-seed-data";
import {
  createEvent,
  deleteEventAction,
  noopCreateEvent,
  noopDeleteEventAction,
} from "./actions";
import { EventsListClient } from "@/components/events/EventsListClient";
import { toJstDateString } from "@/lib/domain/calendar";

dayjs.locale("ja");

const todayStr = () => toJstDateString(new Date());

function splitActivePast(events: EventRow[]): { active: EventRow[]; past: EventRow[] } {
  const today = todayStr();
  const active: EventRow[] = [];
  const past: EventRow[] = [];
  for (const e of events) {
    const end = e.end_date ?? e.start_date ?? "";
    if (end >= today) active.push(e);
    else past.push(e);
  }
  active.sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  past.sort((a, b) => (b.end_date ?? b.start_date ?? "").localeCompare(a.end_date ?? a.start_date ?? ""));
  return { active, past };
}

type PageProps = { searchParams?: Promise<{ calendarId?: string }> };

export default async function EventsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;
  const params = searchParams ? await searchParams : undefined;
  const urlCalendarId = params?.calendarId ?? null;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const events = getMockEvents();
    const { active, past } = splitActivePast(events);
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。カレンダーと同じモックイベントを表示しています。</p>
        </section>
        <EventsListClient
          initialActive={active}
          initialPast={past}
          calendarId={calendar.id}
          calendarName={calendar.name}
          createAction={noopCreateEvent}
          deleteAction={noopDeleteEventAction}
        />
      </div>
    );
  }

  if (!user) redirect("/login");
  const currentCalendar = await getCurrentCalendarForUser(user.id, urlCalendarId);
  if (!currentCalendar) redirect("/dashboard/settings");
  if (!urlCalendarId) {
    redirect(`/dashboard/events?calendarId=${encodeURIComponent(currentCalendar.id)}`);
  }
  const events = await listEventsForCalendar(currentCalendar.id);
  const { active, past } = splitActivePast(events);

  return (
    <div className="space-y-4">
      <EventsListClient
        initialActive={active}
        initialPast={past}
        calendarId={currentCalendar.id}
        calendarName={currentCalendar.name}
        createAction={createEvent}
        deleteAction={deleteEventAction}
      />
    </div>
  );
}
