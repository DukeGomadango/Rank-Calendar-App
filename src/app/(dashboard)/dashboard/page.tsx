import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar } from "@/lib/data/events";
import { ScheduleForm } from "@/components/schedule/ScheduleForm";
import { saveScheduleEntry } from "./actions";

export default async function DashboardHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const events = await listEventsForCalendar(calendar.id);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ダッシュボード
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          ログイン中のライバー用に、カレンダー
          <span className="font-medium">「{calendar.name ?? "メインカレンダー"}」</span>
          を基準にしたサマリをここに表示していきます。
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          今日のスケジュールを登録
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          日付ごとに +ボーダー・目標+・実績+・スキップパス使用有無を登録できます。まずはシンプルに 1
          日分の情報だけを保存するフォームです。
        </p>

        <ScheduleForm
          calendarId={calendar.id}
          defaultDate={defaultDate}
          action={saveScheduleEntry}
          events={events}
        />
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        計画どおりの実装を進める中で、まずは Supabase 認証とカレンダー用データ構造を整えた後、このホーム画面に「今週の+サマリ」「直近7実働日のブロック表示」「今日のスケジュールカード」などを配置します。
      </section>
    </div>
  );
}

