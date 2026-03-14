import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultCalendarForUser } from "@/lib/data/calendars";
import { getOrCreateCalendarRankState } from "@/lib/data/calendar-rank-state";
import { updateCurrentRank, updateRankResetDate } from "@/app/(dashboard)/dashboard/actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ViewModeToggle } from "@/components/settings/ViewModeToggle";
import { RankSettingsForm } from "@/components/settings/RankSettingsForm";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const rankState = await getOrCreateCalendarRankState(calendar.id);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          表示などの設定を行います。
        </p>
      </header>

      <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          ランク設定
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          IRIAM の現在ランクと集計周期のリセット日を合わせます。ランクズレやリセット日のずれがあるときにここで修正できます。
        </p>
        <RankSettingsForm
          calendarId={calendar.id}
          currentRank={rankState.current_rank}
          rankResetDate={rankState.rank_reset_date}
          onUpdateCurrentRank={updateCurrentRank}
          onUpdateRankResetDate={updateRankResetDate}
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          外観
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          アイコンをクリックでライト／ダークを切替。
        </p>
        <ThemeToggle />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          表示設定
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          リスナーで閲覧するときの表示の濃さを切り替えられます。簡易＝最小限の情報、詳細＝推しと同じ目線で表示（編集はできません）。
        </p>
        <ViewModeToggle />
      </section>
    </div>
  );
}

