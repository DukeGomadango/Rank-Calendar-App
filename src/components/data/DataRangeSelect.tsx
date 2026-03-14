"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { DATA_RANGE_OPTIONS, DEFAULT_DATA_RANGE_DAYS } from "@/lib/data-range";

type Props = { currentDays: number };

export function DataRangeSelect({ currentDays }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = e.target.value;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (days === String(DEFAULT_DATA_RANGE_DAYS)) {
      next.delete("days");
    } else {
      next.set("days", days);
    }
    const query = next.toString();
    router.push(query ? `/dashboard/data?${query}` : "/dashboard/data");
  };

  return (
    <label className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
      <span>表示:</span>
      <select
        value={currentDays}
        onChange={handleChange}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
      >
        {DATA_RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
