import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  setup_wizard_done: boolean;
  onboarding_step: number;
};

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, setup_wizard_done, onboarding_step")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throwDataLayerError(
      new Error(`profiles select failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
  return data as ProfileRow | null;
}

export async function upsertDisplayName(
  userId: string,
  displayName: string | null
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, display_name: displayName?.trim() || null },
      { onConflict: "id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`profiles upsert failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function setSetupWizardDone(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, setup_wizard_done: true },
      { onConflict: "id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`profiles update (setup_wizard_done) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function updateAvatarUrl(
  userId: string,
  avatarUrl: string | null
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, avatar_url: avatarUrl?.trim() || null },
      { onConflict: "id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`profiles update (avatar_url) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}

export async function updateOnboardingStep(
  userId: string,
  step: number
): Promise<void> {
  if (step < 1 || step > 6) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, onboarding_step: step },
      { onConflict: "id" }
    );

  if (error) {
    throwDataLayerError(
      new Error(`profiles update (onboarding_step) failed: ${error.message ?? ""} (code=${error.code ?? "unknown"})`)
    );
  }
}
