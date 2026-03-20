/**
 * 週ビュー時間軸用: スナップ・重なり列割当（連結成分単位）。
 * 日付・タイムゾーンは呼び出し側の ms 軸に委ねる。
 */

export const WEEK_VIEW_SLOT_MINUTES = 15;

/** 1 日あたりの分数（週ビュー列は 0:00〜翌 0:00） */
export const MINUTES_PER_DAY = 24 * 60;

export type WeekViewSegment = {
  /** レイアウト結果をマップするための一意キー（同一予定の日をまたぐセグメントでもよい） */
  id: string;
  /** 列内での開始 ms（含む） */
  startMs: number;
  /** 列内での終了 ms（含まない半開区間推奨だが、呼び出し側と揃える） */
  endMs: number;
};

export type WeekViewLayoutEntry = {
  id: string;
  column: number;
  /** このセグメントが属する連結成分内の列数 */
  columnCount: number;
};

/**
 * 分オフセット（0〜1440 想定）を最寄りのスロット境界に丸める。
 * 1440 は「翌日 0:00」相当としてそのまま許可。
 */
export function snapMinutesToSlot(
  minutesFromDayStart: number,
  slotMinutes: number = WEEK_VIEW_SLOT_MINUTES
): number {
  if (slotMinutes <= 0) return minutesFromDayStart;
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, minutesFromDayStart));
  const snapped = Math.round(clamped / slotMinutes) * slotMinutes;
  return Math.max(0, Math.min(MINUTES_PER_DAY, snapped));
}

/**
 * 縦方向の比率 (0..1) から日オフセット（常に 0：単一日列）とスナップ済み「その日内的」分を返す。
 */
export function yRatioToSnappedDayMinutes(
  ratio: number,
  slotMinutes: number = WEEK_VIEW_SLOT_MINUTES
): { dayOffset: number; minutesInDay: number } {
  const r = Math.max(0, Math.min(1, ratio));
  const raw = r * MINUTES_PER_DAY;
  const snapped = snapMinutesToSlot(raw, slotMinutes);
  return { dayOffset: 0, minutesInDay: snapped };
}

/** 半開区間 [start, end) として重なり判定（接続のみは重ならない） */
export function segmentsOverlap(a: WeekViewSegment, b: WeekViewSegment): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/**
 * 重なりグラフの連結成分ごとに greedy 列割当し、成分内の最大列数を各セグメントの columnCount とする。
 */
export function assignWeekColumnLayout(segments: WeekViewSegment[]): Map<string, WeekViewLayoutEntry> {
  const result = new Map<string, WeekViewLayoutEntry>();
  if (segments.length === 0) return result;

  const n = segments.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (segmentsOverlap(segments[i], segments[j])) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  const visited = new Uint8Array(n);
  const componentIndices: number[][] = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const comp: number[] = [];
    const stack = [i];
    visited[i] = 1;
    while (stack.length) {
      const v = stack.pop()!;
      comp.push(v);
      for (const u of adj[v]) {
        if (!visited[u]) {
          visited[u] = 1;
          stack.push(u);
        }
      }
    }
    componentIndices.push(comp);
  }

  for (const comp of componentIndices) {
    const ordered = [...comp].sort((ai, bi) => {
      const sa = segments[ai].startMs - segments[bi].startMs;
      if (sa !== 0) return sa;
      return segments[ai].endMs - segments[bi].endMs;
    });

    const columnEnds: number[] = [];

    for (const idx of ordered) {
      const seg = segments[idx];
      let chosen = -1;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= seg.startMs) {
          chosen = c;
          break;
        }
      }
      if (chosen < 0) {
        chosen = columnEnds.length;
        columnEnds.push(seg.endMs);
      } else {
        columnEnds[chosen] = seg.endMs;
      }
      result.set(seg.id, {
        id: seg.id,
        column: chosen,
        columnCount: 0,
      });
    }

    const columnCount = columnEnds.length;
    for (const idx of comp) {
      const seg = segments[idx];
      const entry = result.get(seg.id);
      if (entry) entry.columnCount = columnCount;
    }
  }

  return result;
}
