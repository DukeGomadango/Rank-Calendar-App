/** calendar_schedules の shift / resize で使う日時ユーティリティ（Server Action からも利用）。 */

export function parseYMD(d: string): { y: number; mo: number; da: number } {
  const [y, mo, da] = d.split("-").map((v) => Number(v));
  return { y, mo, da };
}

export function parseHHMM(t: string): { hh: number; mm: number } {
  const [hh, mm] = t.split(":").map((v) => Number(v));
  return { hh, mm };
}

export function utcMsFromYmdAndHhmm(dateStr: string, timeStr: string): number {
  const { y, mo, da } = parseYMD(dateStr);
  const { hh, mm } = parseHHMM(timeStr);
  return Date.UTC(y, mo - 1, da, hh, mm, 0);
}

export function formatYmdUtc(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function formatHhmmUtc(ms: number): string {
  const dt = new Date(ms);
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const mm = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
