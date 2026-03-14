import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { listEventsForCalendar } from "@/lib/data/events";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { toJstDateString, getJstWeekStart } from "@/lib/domain/calendar";
import { judgeWeeklyRank, type RankEntry } from "@/lib/domain/rank";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { ScheduleForm } from "@/components/schedule/ScheduleForm";
import { saveScheduleEntry, noopSaveEntry } from "./actions";

const DEV_MOCK_BANNER = (
  <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
    <p>開発用モック表示です。データは保存されません。</p>
  </section>
);

export default async function DashboardHomePage() {
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
    const events: { id: string; name: string }[] = [];
    const todayJst = toJstDateString(new Date());
    const weekStartJst = getJstWeekStart(todayJst);
    const [y, m, d] = weekStartJst.split("-").map((v) => Number.parseInt(v, 10));
    const startDate = new Date(y, m - 1, d);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const weekEndJst = toJstDateString(endDate);
    const rankEntries: RankEntry[] = [];
    const judgements = judgeWeeklyRank(rankEntries);
    const thisWeek = judgements.find((j) => j.weekStart === weekStartJst);
    const totalPlus = thisWeek?.totalPlus ?? 0;
    const maxPlus = 18;
    const progressRatio = Math.max(0, Math.min(1, maxPlus === 0 ? 0 : totalPlus / maxPlus));
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const defaultDate = `${yyyy}-${mm}-${dd}`;
    const hasWeeklySchedule = false;
    const todayEntry = undefined;

    return (
      <div className="space-y-6">
        {DEV_MOCK_BANNER}
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
        <OnboardingCard />
        <section
          id="empty-schedule-cta"
          className="rounded-xl border border-pink-200 bg-pink-50/80 p-4 text-xs dark:border-pink-800 dark:bg-pink-950/30"
        >
          <p className="font-medium text-pink-800 dark:text-pink-200">
            今週はまだスケジュールがありません
          </p>
          <p className="mt-1 text-[11px] text-pink-700 dark:text-pink-300">
            下のフォームから今日の目標+を登録すると、今週の+サマリに反映されます。
          </p>
        </section>
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            今週の+サマリ（JST）
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            月曜はじまりの 1 週間ぶんの +実績合計です。スキップパス使用日は合計から除外し、+0
            の休み日は 0 としてカウントします。
          </p>
          <div className="space-y-2 rounded-lg bg-zinc-50/80 p-3 dark:bg-zinc-950/40">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  今週の実績+ 合計
                </span>
                <span className="text-sm font-mono text-pink-600 dark:text-pink-300">
                  {totalPlus} / {maxPlus}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {weekStartJst} 〜 {weekEndJst}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-amber-400 transition-[width]"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200">
                +18 で翌日ランクアップ
              </span>
              <span className="inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200">
                +12 で中間目標
              </span>
            </div>
          </div>
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
            action={noopSaveEntry}
            events={events}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          <p>
            カレンダー・データタブで他の日も登録・編集できます。設定からイベント追加やリスナー招待ができます。
          </p>
        </section>
      </div>
    );
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const events = await listEventsForCalendar(calendar.id);

  // JST 基準で今週（月〜日）の範囲を計算
  const todayJst = toJstDateString(new Date());
  const weekStartJst = getJstWeekStart(todayJst);
  const [y, m, d] = weekStartJst.split("-").map((v) => Number.parseInt(v, 10));
  const startDate = new Date(y, m - 1, d);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const weekEndJst = toJstDateString(endDate);

  const weeklyEntries = await getScheduleEntriesInRange(
    calendar.id,
    weekStartJst,
    weekEndJst
  );

  const rankEntries: RankEntry[] = weeklyEntries.map((e) => ({
    date: e.date,
    actual_plus: e.actual_plus,
    skip_pass_used: e.skip_pass_used,
  }));
  const judgements = judgeWeeklyRank(rankEntries);
  const thisWeek = judgements.find((j) => j.weekStart === weekStartJst);
  const totalPlus = thisWeek?.totalPlus ?? 0;
  const maxPlus: number = 18;
  const progressRatio = Math.max(
    0,
    Math.min(1, maxPlus === 0 ? 0 : totalPlus / maxPlus)
  );

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const hasWeeklySchedule = weeklyEntries.length > 0;
  const todayEntry = weeklyEntries.find((e) => e.date === defaultDate);

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

      <OnboardingCard />

      {!hasWeeklySchedule && (
        <section
          id="empty-schedule-cta"
          className="rounded-xl border border-pink-200 bg-pink-50/80 p-4 text-xs dark:border-pink-800 dark:bg-pink-950/30"
        >
          <p className="font-medium text-pink-800 dark:text-pink-200">
            今週はまだスケジュールがありません
          </p>
          <p className="mt-1 text-[11px] text-pink-700 dark:text-pink-300">
            下のフォームから今日の目標+を登録すると、今週の+サマリに反映されます。
          </p>
        </section>
      )}

      {hasWeeklySchedule && !todayEntry && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-amber-800 dark:text-amber-200">
            今日のスケジュールはまだ登録していません。下のフォームから登録できます。
          </p>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          今週の+サマリ（JST）
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          月曜はじまりの 1 週間ぶんの +実績合計です。スキップパス使用日は合計から除外し、+0
          の休み日は 0 としてカウントします。
        </p>
        <div className="space-y-2 rounded-lg bg-zinc-50/80 p-3 dark:bg-zinc-950/40">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                今週の実績+ 合計
              </span>
              <span className="text-sm font-mono text-pink-600 dark:text-pink-300">
                {totalPlus} / {maxPlus}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {weekStartJst} 〜 {weekEndJst}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-amber-400 transition-[width]"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={
                thisWeek?.canRankUpNextDay
                  ? "inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : "inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
              }
            >
              {thisWeek?.canRankUpNextDay
                ? "+18 達成！翌日ランクアップ条件クリア"
                : "+18 で翌日ランクアップ"}
            </span>
            <span
              className={
                thisWeek?.reachedIntermediate
                  ? "inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                  : "inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200"
              }
            >
              {thisWeek?.reachedIntermediate
                ? "+12 以上（中間目標クリア）"
                : "+12 で中間目標"}
            </span>
          </div>
        </div>
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

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        <p>
          カレンダー・データタブで他の日も登録・編集できます。設定からイベント追加やリスナー招待ができます。
        </p>
      </section>
    </div>
  );
}

