/**
 * イベント用カラーパレット。カレンダー帯・イベントカードで共通利用。
 */
export const EVENT_PALETTE = [
  { id: "rose", label: "ピンク", swatch: "bg-rose-400", border: "border-rose-400 dark:border-rose-500", bg: "bg-rose-50/95 dark:bg-rose-950/60", text: "text-rose-800 dark:text-rose-200" },
  { id: "blue", label: "青", swatch: "bg-blue-400", border: "border-blue-400 dark:border-blue-500", bg: "bg-blue-50/95 dark:bg-blue-950/60", text: "text-blue-800 dark:text-blue-200" },
  { id: "emerald", label: "緑", swatch: "bg-emerald-400", border: "border-emerald-400 dark:border-emerald-500", bg: "bg-emerald-50/95 dark:bg-emerald-950/60", text: "text-emerald-800 dark:text-emerald-200" },
  { id: "amber", label: "黄", swatch: "bg-amber-400", border: "border-amber-400 dark:border-amber-500", bg: "bg-amber-50/95 dark:bg-amber-950/60", text: "text-amber-800 dark:text-amber-200" },
  { id: "violet", label: "紫", swatch: "bg-violet-400", border: "border-violet-400 dark:border-violet-500", bg: "bg-violet-50/95 dark:bg-violet-950/60", text: "text-violet-800 dark:text-violet-200" },
  { id: "sky", label: "水色", swatch: "bg-sky-400", border: "border-sky-400 dark:border-sky-500", bg: "bg-sky-50/95 dark:bg-sky-950/60", text: "text-sky-800 dark:text-sky-200" },
] as const;

export type EventColorId = (typeof EVENT_PALETTE)[number]["id"];

const FALLBACK = EVENT_PALETTE[0];

export function getEventColorClasses(color: string | null): { border: string; bg: string; text: string; leftBar: string } {
  if (!color) {
    return { border: FALLBACK.border, bg: FALLBACK.bg, text: FALLBACK.text, leftBar: `border-l-4 ${FALLBACK.border}` };
  }
  const found = EVENT_PALETTE.find((c) => c.id === color);
  const b = found ? found.border : FALLBACK.border;
  const bg = found ? found.bg : FALLBACK.bg;
  const text = found ? found.text : FALLBACK.text;
  return { border: b, bg, text, leftBar: `border-l-4 ${b}` };
}

/** モバイル月ビューのドット用。パレットのスウォッチ（ solid ）を返す。 */
export function getEventColorDotClass(color: string | null): string {
  if (!color) return FALLBACK.swatch;
  const found = EVENT_PALETTE.find((c) => c.id === color);
  return found ? found.swatch : FALLBACK.swatch;
}
