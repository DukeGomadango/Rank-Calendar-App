import dayjs from "dayjs";
import "dayjs/locale/ja";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { getCalendarPermissionsForUser } from "@/lib/auth/permission";
import { DataTable } from "@/components/data/DataTable";

dayjs.locale("ja");

export default async function DataPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const permissions = await getCalendarPermissionsForUser(calendar.id, user.id);

  if (!permissions.canViewTable) {
    return (
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            データ
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            このカレンダーのデータテーブルを閲覧する権限がありません。オーナーに権限の付与を依頼してください。
          </p>
        </header>
      </div>
    );
  }

  const today = dayjs();
  const from = today.subtract(30, "day").format("YYYY-MM-DD");
  const to = today.add(30, "day").format("YYYY-MM-DD");

  const entries = await getScheduleEntriesInRange(calendar.id, from, to);
  const entriesByDate = new Map(entries.map((e) => [e.date, e]));

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  const rows: { date: string; weekday: string; id?: string; border_plus2?: number | null; border_plus4?: number | null; border_plus6?: number | null; target_plus?: number | null; actual_plus?: number | null; skip_pass_used?: boolean }[] = [];

  let cursor = dayjs(from);
  const end = dayjs(to);
  while (cursor.isSame(end) || cursor.isBefore(end)) {
    const dateStr = cursor.format("YYYY-MM-DD");
    const weekday = WEEKDAYS[cursor.day()];
    const entry = entriesByDate.get(dateStr);
    rows.push({
      date: dateStr,
      weekday,
      ...(entry ?? {}),
    });
    cursor = cursor.add(1, "day");
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          データ
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {calendar.name ?? "メインカレンダー"} の直近 30 日前〜30 日後のスケジュールを一覧表示します。
        </p>
      </header>
      <DataTable data={rows} permissions={permissions} />
    </div>
  );
}

