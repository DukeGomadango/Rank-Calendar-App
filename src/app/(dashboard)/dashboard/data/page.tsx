import { DataPageClient } from "./DataPageClient";
import { parseDaysParam } from "@/lib/data-range";
import { updateScheduleEntryField, updateSkipPassSnapshot } from "../actions";

type PageProps = { searchParams?: Promise<{ days?: string; calendarId?: string }> | { days?: string; calendarId?: string } };

export default async function DataPage(props: PageProps) {
  const rawSp = props.searchParams;
  const resolvedSp: { days?: string; calendarId?: string } =
    rawSp && typeof (rawSp as Promise<unknown>).then === "function"
      ? await (rawSp as Promise<{ days?: string; calendarId?: string }>)
      : (rawSp ?? {}) as { days?: string; calendarId?: string };
  const daysRange = parseDaysParam(resolvedSp.days);
  return (
    <DataPageClient
      daysRange={daysRange}
      onUpdateField={updateScheduleEntryField}
      onUpdateSkipPassSnapshot={updateSkipPassSnapshot}
    />
  );
}

