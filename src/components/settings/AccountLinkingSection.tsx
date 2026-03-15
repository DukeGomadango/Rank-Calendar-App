"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserIdentity } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProviderId = "google" | "discord";

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "discord", label: "Discord" },
];

/** Supabase UserIdentity の provider 名（API が返す値） */
function normalizeProvider(provider: string): ProviderId | null {
  const p = provider?.toLowerCase();
  if (p === "google") return "google";
  if (p === "discord") return "discord";
  return null;
}

type Props = {
  /** 未ログイン or モックのときは表示しない */
  isEnabled?: boolean;
};

export function AccountLinkingSection({ isEnabled = true }: Props) {
  const router = useRouter();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkPending, setLinkPending] = useState<ProviderId | null>(null);
  const [unlinkPendingId, setUnlinkPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const fetchIdentities = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(data?.identities ?? []);
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      await fetchIdentities();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEnabled, fetchIdentities]);

  const handleLink = async (provider: ProviderId) => {
    setMessage(null);
    setLinkPending(provider);
    const supabase = createSupabaseBrowserClient();
    const baseUrl =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
        : "";
    const redirectTo = baseUrl
      ? `${baseUrl}/auth/callback?redirect_to=${encodeURIComponent("/dashboard/settings")}`
      : undefined;

    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        ...(redirectTo && { options: { redirectTo } }),
      });
      if (error) {
        setMessage({ type: "error", text: error.message || "連携に失敗しました" });
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      await fetchIdentities();
      router.refresh();
      setMessage({ type: "ok", text: `${PROVIDERS.find((p) => p.id === provider)?.label ?? provider} を連携しました` });
    } finally {
      setLinkPending(null);
    }
  };

  const handleUnlink = async (identity: UserIdentity) => {
    const provider = normalizeProvider(identity.provider);
    if (!provider) return;
    if (identities.length < 2) {
      setMessage({ type: "error", text: "少なくとも1つのログイン方法が必要です。解除できません。" });
      return;
    }
    setMessage(null);
    setUnlinkPendingId(identity.identity_id ?? identity.id ?? null);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        setMessage({ type: "error", text: error.message || "解除に失敗しました" });
        return;
      }
      await fetchIdentities();
      router.refresh();
      setMessage({ type: "ok", text: `${PROVIDERS.find((p) => p.id === provider)?.label ?? identity.provider} の連携を解除しました` });
    } finally {
      setUnlinkPendingId(null);
    }
  };

  if (!isEnabled) return null;

  const linkedProviders = new Set(
    identities.map((i) => normalizeProvider(i.provider)).filter(Boolean) as ProviderId[]
  );

  return (
    <section className="rounded-2xl bg-white p-4 text-xs text-zinc-700 shadow-md dark:bg-slate-800 dark:text-zinc-200">
      <h2 className="mb-3 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
        アカウント連携
      </h2>
      <p className="mb-4 text-[11px] text-zinc-500 dark:text-zinc-400">
        Google や Discord を連携すると、そのアカウントでもログインできるようになります。連携解除は、残り1つ以上のログイン方法がある場合のみ可能です。
      </p>
      {loading ? (
        <p className="text-[11px] text-zinc-500">読み込み中…</p>
      ) : (
        <ul className="space-y-3">
          {PROVIDERS.map(({ id, label }) => {
            const linked = linkedProviders.has(id);
            const identity = identities.find((i) => normalizeProvider(i.provider) === id);
            return (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
                <div className="flex items-center gap-2">
                  {linked ? (
                    <>
                      <span className="text-[11px] text-green-600 dark:text-green-400">
                        連携済み
                      </span>
                      {identity && identities.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => handleUnlink(identity)}
                          disabled={unlinkPendingId !== null}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          {unlinkPendingId === (identity.identity_id ?? identity.id) ? "解除中…" : "連携を解除"}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLink(id)}
                      disabled={linkPending !== null}
                      className="rounded bg-accent-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-600 disabled:opacity-50"
                    >
                      {linkPending === id ? "リダイレクト中…" : "連携する"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {message && (
        <p
          className={`mt-3 text-[11px] ${message.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
