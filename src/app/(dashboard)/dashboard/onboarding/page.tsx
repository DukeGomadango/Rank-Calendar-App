import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profiles";
import {
  getCurrentCalendarForUser,
  getOrCreateDefaultCalendarForUser,
} from "@/lib/data/calendars";
import { getOrCreateCalendarRankState } from "@/lib/data/calendar-rank-state";
import { addDays, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";
import { SetupWizard } from "@/components/onboarding/SetupWizard";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);
  if (profile?.setup_wizard_done) {
    const currentCalendar = await getCurrentCalendarForUser(user.id, null);
    if (!currentCalendar) {
      redirect("/dashboard/settings");
    }
    redirect(`/dashboard?calendarId=${encodeURIComponent(currentCalendar.id)}`);
  }

  const calendar = await getOrCreateDefaultCalendarForUser(user.id);
  const rankState = await getOrCreateCalendarRankState(calendar.id);

  const initialStep = Math.min(6, Math.max(1, profile?.onboarding_step ?? 1));

  const todayJst = toJstDateString(new Date());
  const thisWeekStart = getJstWeekStart(todayJst);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const initialRankResetDate = rankState.rank_reset_date ?? thisWeekEnd;

  return (
    <div className="min-h-[60vh] py-8">
      <SetupWizard
        initialStep={initialStep}
        initialLiverName={profile?.display_name ?? ""}
        initialCurrentRank={rankState.current_rank ?? ""}
        initialSkipPassCount={rankState.skip_pass_remaining ?? 0}
        initialTargetRank={rankState.target_rank ?? ""}
        initialRankResetDate={initialRankResetDate}
      />
    </div>
  );
}
