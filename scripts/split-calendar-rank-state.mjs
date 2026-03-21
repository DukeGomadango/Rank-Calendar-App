import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "src/lib/data/calendar-rank-state.ts");
const outDir = path.join(root, "src/lib/data/calendar-rank-state");

const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const typesFile = `import type { RankLabel } from "@/lib/domain/rank";

export type CalendarRankStateRow = {
  calendar_id: string;
  current_rank: RankLabel | null;
  target_rank: RankLabel | null;
  rank_cycle_start_date: string;
  rank_reset_date: string;
  skip_pass_remaining: number;
  skip_pass_last_increment_week_start: string | null;
};

export type SkipPassSnapshotRow = { as_of_date: string; remaining: number };

export type RankCycleHistoryRow = {
  id: string;
  calendar_id: string;
  cycle_start_date: string;
  cycle_end_date: string;
  rank_during: RankLabel | null;
};
`;

const core = `import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import {
  addDays,
  getCycleEndDateIncludingSkips,
  getJstWeekStart,
  toJstDateString,
} from "@/lib/domain/calendar";

import type { CalendarRankStateRow } from "./types";

${slice(20, 135)}
`;

const skipPass = `import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { addDays, getJstWeekStart, toJstDateString } from "@/lib/domain/calendar";

import { getOrCreateCalendarRankState } from "./core";

${slice(137, 334)}
`;

const history = `import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RankCycleHistoryRow } from "./types";

${slice(347, 395)}
`;

const mutations = `import { throwDataLayerError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getScheduleEntriesInRange } from "@/lib/data/schedule-entries";
import { addDays, getCycleEndDateIncludingSkips } from "@/lib/domain/calendar";
import type { RankLabel } from "@/lib/domain/rank";

import { getOrCreateCalendarRankState } from "./core";
import { insertRankCycleHistory } from "./history";

${slice(402, 519)}
`;

const index = `export type {
  CalendarRankStateRow,
  SkipPassSnapshotRow,
  RankCycleHistoryRow,
} from "./types";

export {
  getCalendarRankState,
  getOrCreateCalendarRankState,
  extendRankResetDate,
  recalculateRankResetDateFromCurrentCycle,
} from "./core";

export {
  insertSkipPassSnapshot,
  getSkipPassSnapshotsBefore,
  setSkipPassSnapshot,
  ensureSkipPassIncrementForLastWeek,
  decrementSkipPassRemaining,
  restoreSkipPassRemaining,
  updateSkipPassRemaining,
} from "./skip-pass";

export { getRankCycleHistory, insertRankCycleHistory } from "./history";

export {
  applyRankUp,
  updateCurrentRank,
  updateTargetRank,
  updateRankResetDate,
} from "./mutations";
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "types.ts"), typesFile);
fs.writeFileSync(path.join(outDir, "core.ts"), core);
fs.writeFileSync(path.join(outDir, "skip-pass.ts"), skipPass);
fs.writeFileSync(path.join(outDir, "history.ts"), history);
fs.writeFileSync(path.join(outDir, "mutations.ts"), mutations);
fs.writeFileSync(path.join(outDir, "index.ts"), index);

fs.unlinkSync(srcPath);
console.log("split calendar-rank-state ok");
