"use client";

import { useTheme } from "@/lib/theme-context";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { resolvedDark, setTheme } = useTheme();

  return (
    <button
      type="button"
      title={resolvedDark ? "ライトモードにする" : "ダークモードにする"}
      onClick={() => setTheme(resolvedDark ? "light" : "dark")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 shadow-sm transition hover:bg-zinc-200 hover:text-zinc-900 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600 dark:hover:text-zinc-50"
    >
      {resolvedDark ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  );
}
