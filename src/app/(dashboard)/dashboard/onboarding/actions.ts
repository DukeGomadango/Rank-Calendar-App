"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOrCreateDefaultCalendarForUser,
  updateCalendarName,
} from "@/lib/data/calendars";
import {
  updateCurrentRank,
  updateTargetRank,
  updateSkipPassRemaining,
  updateRankResetDate,
} from "@/lib/data/calendar-rank-state";
import { upsertDisplayName, setSetupWizardDone, updateOnboardingStep } from "@/lib/data/profiles";
import { createEventForCalendar } from "@/lib/data/events";
import type { RankLabel } from "@/lib/domain/rank";
import { RANK_ORDER } from "@/lib/domain/rank";

const RANK_VALUES = RANK_ORDER as readonly string[];

function parseRank(v: unknown): RankLabel | null {
  if (typeof v !== "string" || !RANK_VALUES.includes(v)) return null;
  return v as RankLabel;
}

export async function saveOnboardingStep1(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const liverName = (formData.get("liver_name") as string)?.trim() || null;
  try {
    await upsertDisplayName(user.id, liverName);
    const calendar = await getOrCreateDefaultCalendarForUser(user.id);
    await updateCalendarName(calendar.id, liverName || "メインカレンダー");
    await updateOnboardingStep(user.id, 2);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveOnboardingStep2(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const rank = parseRank(formData.get("current_rank"));
  try {
    const calendar = await getOrCreateDefaultCalendarForUser(user.id);
    await updateCurrentRank(calendar.id, rank);
    await updateOnboardingStep(user.id, 3);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveOnboardingStep3(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const raw = formData.get("skip_pass_count");
  const n = raw !== null && raw !== "" ? Number(raw) : 0;
  const count = Math.min(10, Math.max(0, Number.isNaN(n) ? 0 : n));
  try {
    const calendar = await getOrCreateDefaultCalendarForUser(user.id);
    await updateSkipPassRemaining(calendar.id, count);
    await updateOnboardingStep(user.id, 4);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveOnboardingStep4(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const rank = parseRank(formData.get("target_rank"));
  try {
    const calendar = await getOrCreateDefaultCalendarForUser(user.id);
    await updateTargetRank(calendar.id, rank);
    await updateOnboardingStep(user.id, 5);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveOnboardingStep5(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  const raw = (formData.get("rank_reset_date") as string | null)?.trim() ?? "";
  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (!isValid) {
    return { ok: false, error: "日付の形式が正しくありません" };
  }

  try {
    const calendar = await getOrCreateDefaultCalendarForUser(user.id);
    await updateRankResetDate(calendar.id, raw);
    await updateOnboardingStep(user.id, 6);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveOnboardingStep5AndFinish(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  try {
    const calendar = await getOrCreateDefaultCalendarForUser(user.id);
    const name = (formData.get("event_name") as string)?.trim();
    const startStr = (formData.get("event_start") as string)?.trim();
    const endStr = (formData.get("event_end") as string)?.trim();
    const color = (formData.get("event_color") as string)?.trim() || null;
    if (name && startStr && endStr) {
      await createEventForCalendar(calendar.id, name, startStr, endStr, color, "ranking");
    }
    await setSetupWizardDone(user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function finishOnboardingWithoutEvent(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未ログインです" };

  try {
    await setSetupWizardDone(user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" };
  }
  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}
