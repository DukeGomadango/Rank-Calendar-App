import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dash = path.join(root, "src/app/(dashboard)/dashboard");

const schedHeader = `import { revalidatePath } from "next/cache";

import { ensureUserCanEditCalendar } from "@/lib/auth/permission";
import {
  getScheduleByIdInCalendar,
  type CalendarScheduleUpsertInput,
} from "@/lib/data/schedules";
import {
  rpcCalendarScheduleApplyDeleteUndo,
  rpcCalendarScheduleApplyUpsertUndo,
  rpcCalendarScheduleRedo,
  rpcCalendarScheduleUndo,
} from "@/lib/data/calendar-schedule-rpc";

`;

const entryHeader = `import { revalidatePath } from "next/cache";

import {
  upsertScheduleEntryForDate,
  getScheduleEntriesInRange,
} from "@/lib/data/schedule-entries";
import {
  getOrCreateCalendarRankState,
  extendRankResetDate,
  recalculateRankResetDateFromCurrentCycle,
  decrementSkipPassRemaining,
  restoreSkipPassRemaining,
  updateSkipPassRemaining as updateSkipPassRemainingState,
  setSkipPassSnapshot,
  ensureSkipPassIncrementForLastWeek,
} from "@/lib/data/calendar-rank-state";
import { compareJstDate } from "@/lib/domain/calendar";
import { MAX_BORDER_VALUE } from "@/lib/border-constants";
import { ensureUserCanEditCalendar } from "@/lib/auth/permission";
import { throwDataLayerError } from "@/lib/errors";
import {
  saveScheduleEntrySchema,
  type SaveScheduleEntryResult,
} from "@/lib/validations/schedule";

`;

const rankHeader = `import { revalidatePath } from "next/cache";

import { ensureUserCanEditCalendar } from "@/lib/auth/permission";

`;

const actionsDir = path.join(dash, "actions");
fs.writeFileSync(
  path.join(dash, "calendar-schedule-actions.ts"),
  schedHeader + fs.readFileSync(path.join(actionsDir, "_sched_body.txt"), "utf8") + "\n"
);
fs.writeFileSync(
  path.join(dash, "schedule-entry-actions.ts"),
  entryHeader + fs.readFileSync(path.join(actionsDir, "_entry_body.txt"), "utf8") + "\n"
);
fs.writeFileSync(
  path.join(dash, "rank-actions.ts"),
  rankHeader + fs.readFileSync(path.join(actionsDir, "_rank_body.txt"), "utf8") + "\n"
);
console.log("ok");
