/** 通常時は枠線なし、hover/focus 時のみ枠線。スマホで潰れないよう最小幅を確保 */
export const inputClass =
  "w-full min-w-[80px] rounded border border-transparent bg-white px-1.5 py-0.5 text-[11px] text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-accent-400";
export const selectClass =
  "w-full min-w-[80px] rounded border border-transparent bg-white px-1 py-0.5 text-[11px] text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-accent-400";
/** スキップパス使用行用：グレーアウト・非活性見た目 */
export const inputClassDisabled =
  "w-full min-w-[80px] rounded border border-transparent bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed";
export const selectClassDisabled =
  "w-full min-w-[80px] rounded border border-transparent bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed";
