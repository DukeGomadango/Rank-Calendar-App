"use client";

import { useCallback, useState } from "react";
import { CheckIcon, ClipboardIcon } from "@/components/icons/DashboardIcons";

type Props = {
  calendarId: string;
  token: string;
};

export function CopyInviteUrl({ calendarId, token }: Props) {
  const [copied, setCopied] = useState(false);
  const path = `/invite/${calendarId}/${token}`;

  const copy = useCallback(async () => {
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [path]);

  return (
    <div className="flex items-center gap-2">
      <code className="max-w-[200px] truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] dark:bg-zinc-800 sm:max-w-[320px]">
        {path}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-[11px] hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
      >
        {copied ? (
          <>
            <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            コピーしました
          </>
        ) : (
          <>
            <ClipboardIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
            コピー
          </>
        )}
      </button>
    </div>
  );
}
