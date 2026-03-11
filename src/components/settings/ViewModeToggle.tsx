"use client";

import { useViewMode } from "@/lib/view-mode-context";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
        表示モード
      </span>
      <div className="flex rounded-lg bg-zinc-100 p-0.5 text-[11px] dark:bg-zinc-800">
        {(["simple", "detailed"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              viewMode === mode
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {mode === "simple" ? "簡易" : "詳細（推しと同じ目線）"}
          </button>
        ))}
      </div>
    </div>
  );
}
