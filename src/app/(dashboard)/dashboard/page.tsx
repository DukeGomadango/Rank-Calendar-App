import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { DashboardHomePageClient } from "./DashboardHomePageClient";
import { applyRankUp } from "./rank-actions";
import { saveScheduleEntry } from "./schedule-entry-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profiles";

export default async function DashboardHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <>
      <OnboardingCard />
      <DashboardHomePageClient
        saveScheduleEntry={saveScheduleEntry}
        applyRankUp={applyRankUp}
        displayName={profile?.display_name ?? null}
      />
    </>
  );
}

