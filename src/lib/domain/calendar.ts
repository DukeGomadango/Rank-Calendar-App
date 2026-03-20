export type JstDateString = string; // YYYY-MM-DD （JST 前提）

/**
 * 任意の Date/ISO 文字列から JST（Asia/Tokyo）の日付文字列を返す。
 * Supabase 側は UTC だが、アプリ内の日付ロジックは常に JST 基準で扱う。
 */
export function toJstDateString(input: Date | string): JstDateString {
  const date = typeof input === "string" ? new Date(input) : input;
  // Intl.DateTimeFormat を使ってタイムゾーン変換した上で YYYY-MM-DD を組み立てる
  const fmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type === "year" || part.type === "month" || part.type === "day") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  const year = parts.year ?? "1970";
  const month = parts.month ?? "01";
  const day = parts.day ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * JST 基準での週の開始日（ISO 週の月曜始まり）を返す。
 * IRIAM の週次ランク集計を行う際の「週のキー」として利用する。
 */
export function getJstWeekStart(input: Date | string): JstDateString {
  const dateStr = toJstDateString(input);
  const [year, month, day] = dateStr.split("-").map((v) => Number.parseInt(v, 10));
  // Date はローカルタイムだが、既に JST 日付に丸めているので 0 時で問題ない前提とする
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
  // ISO 週: 月曜始まり。日曜(0)は前週の 7 日目とみなす。
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + offset);
  return toJstDateString(weekStart);
}

/**
 * 2つの JST 日付文字列の大小比較を行う。
 */
export function compareJstDate(a: JstDateString, b: JstDateString): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * JST 日付文字列に n 日を加算した日付を返す。
 * 周期の終了日延長・新周期の reset 計算用。
 */
export function addDays(date: JstDateString, n: number): JstDateString {
  const [y, m, d] = date.split("-").map((v) => Number.parseInt(v, 10));
  const jsDate = new Date(y, m - 1, d);
  jsDate.setDate(jsDate.getDate() + n);
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, "0");
  const day = String(jsDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 周期の終了日を返す。
 * 基準7日間を起点に、周期内で skip_pass_used=true の日があればその都度1日延長する。
 * （延長して増えた日がさらにスキップなら、さらに延長される）
 * 表示・applyRankUp で共通利用。
 */
export function getCycleEndDateIncludingSkips(
  cycleStart: JstDateString,
  entriesByDate: Map<string, { skip_pass_used?: boolean }>
): JstDateString {
  let c = cycleStart;
  let dynamicEnd = addDays(cycleStart, 6);
  while (c <= dynamicEnd) {
    const entry = entriesByDate.get(c);
    if (entry?.skip_pass_used) {
      dynamicEnd = addDays(dynamicEnd, 1);
    }
    c = addDays(c, 1);
  }
  return dynamicEnd;
}

