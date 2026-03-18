import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { DashboardHomePageClient } from "./DashboardHomePageClient";
import { applyRankUp, saveScheduleEntry } from "./actions";

type PageProps = { searchParams?: Promise<{ fromInvite?: string; calendarId?: string }> };

export default async function DashboardHomePage({ searchParams }: PageProps) {
  return (
    <>
      <OnboardingCard />
      <DashboardHomePageClient
        saveScheduleEntry={saveScheduleEntry}
        applyRankUp={applyRankUp}
      />
    </>
  );
}

