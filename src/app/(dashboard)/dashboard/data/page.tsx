import dayjs from "dayjs";
import "dayjs/locale/ja";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import {
  getCalendarPermissionsForUser,
  type CalendarPermissionFlags,
} from "@/lib/auth/permission";
import { DataTable } from "@/components/data/DataTable";
import { DataTableWithMockState } from "@/components/data/DataTableWithMockState";
import { updateScheduleEntryField } from "../actions";

dayjs.locale("ja");

const DEV_MOCK_PERMISSIONS: CalendarPermissionFlags = {
  isOwner: true,
  canEditSchedule: true,
  canViewCalendar: true,
  canViewTable: true,
  canViewBorders: true,
  canViewMemo: true,
  canViewTargetActual: true,
  canViewRank: true,
  canViewEvents: true,
};

export default async function DataPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDevMock = process.env.NODE_ENV === "development" && !user;

  if (!user && !isDevMock) {
    redirect("/login");
  }

  if (isDevMock) {
    const calendar = { id: "dev-mock", name: "開発用モック" as string | null };
    const today = dayjs();
    const from = today.subtract(30, "day").format("YYYY-MM-DD");
    const to = today.add(30, "day").format("YYYY-MM-DD");
    const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
    const rows: {
      date: string;
      weekday: string;
      id?: string;
      border_plus2?: number | null;
      border_plus4?: number | null;
      border_plus6?: number | null;
      target_plus?: number | null;
      actual_plus?: number | null;
      skip_pass_used?: boolean;
    }[] = [];
    let cursor = dayjs(from);
    const end = dayjs(to);
    while (cursor.isSame(end) || cursor.isBefore(end)) {
      rows.push({
        date: cursor.format("YYYY-MM-DD"),
        weekday: WEEKDAYS[cursor.day()],
      });
      cursor = cursor.add(1, "day");
    }
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p>開発用モック表示です。データは保存されません。セルを編集すると画面上にだけ反映されます。</p>
        </section>
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            データ
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {calendar.name ?? "メインカレンダー"} の直近 30 日前〜30 日後のスケジュールを一覧表示します。
          </p>
        </header>
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          <p>
            この期間にはまだスケジュールがありません。ホームやカレンダーから登録しましょう。
          </p>
        </section>
        <DataTableWithMockState
          initialRows={rows}
          permissions={DEV_MOCK_PERMISSIONS}
          calendarId={calendar.id}
        />
      </div>
    );
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

  const hasAnyEntries = entries.length > 0;

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
      {!hasAnyEntries && (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          <p>
            この期間にはまだスケジュールがありません。ホームやカレンダーから登録しましょう。
          </p>
        </section>
      )}
      <DataTable
        data={rows}
        permissions={permissions}
        calendarId={calendar.id}
        onUpdateField={updateScheduleEntryField}
      />
    </div>
  );
}

