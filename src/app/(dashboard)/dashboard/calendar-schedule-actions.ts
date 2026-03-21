import { revalidatePath } from "next/cache";

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
import {
  formatHhmmUtc,
  formatYmdUtc,
  parseYMD,
  utcMsFromYmdAndHhmm,
} from "@/lib/domain/calendar-schedule-datetime";

export type SaveCalendarScheduleResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };

/**
 * 時間付きの予定（calendar_schedules）を1件保存する。
 * id が含まれていれば更新、含まれていなければ新規作成として扱う。
 */
export async function saveCalendarSchedule(
  formData: FormData
): Promise<SaveCalendarScheduleResult> {
  "use server";

  const raw = Object.fromEntries(
    Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? v.name : v])
  );

  const errors: Record<string, string[]> = {};

  const idRaw = raw.id != null ? String(raw.id) : "";
  const calendarId = String(raw.calendar_id ?? "");
  const date = String(raw.date ?? "");
  const endDateRaw = raw.end_date != null ? String(raw.end_date) : "";
  const title = String(raw.title ?? "").trim();
  const isAllDay = String(raw.is_all_day ?? "") === "on";
  const startTimeRaw = raw.start_time != null ? String(raw.start_time) : "";
  const endTimeRaw = raw.end_time != null ? String(raw.end_time) : "";
  const kind = (raw.kind != null ? String(raw.kind).trim() : "") || null;
  const colorId = (raw.color_id != null ? String(raw.color_id).trim() : "") || null;
  const memo =
    raw.memo == null
      ? null
      : (() => {
          const s = String(raw.memo).trim();
          return s === "" ? null : s;
        })();

  if (!calendarId || !/^[0-9a-f-]{36}$/i.test(calendarId)) {
    errors.calendar_id = ["カレンダーIDが不正です"];
  }
  if (idRaw && !/^[0-9a-f-]{36}$/i.test(idRaw)) {
    errors.id = ["予定IDが不正です"];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = ["日付は YYYY-MM-DD 形式で入力してください"];
  }

  const endDate = endDateRaw ? endDateRaw : date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    errors.end_date = ["終了日が YYYY-MM-DD 形式で入力してください"];
  } else if (endDate < date) {
    errors.end_date = ["終了日は開始日以降にしてください"];
  }

  if (!title) {
    errors.title = ["タイトルを入力してください"];
  }
  if (!isAllDay) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(startTimeRaw)) {
      errors.start_time = ["開始時刻を HH:MM 形式で入力してください"];
    }
    if (!timeRegex.test(endTimeRaw)) {
      errors.end_time = ["終了時刻を HH:MM 形式で入力してください"];
    }
    if (timeRegex.test(startTimeRaw) && timeRegex.test(endTimeRaw)) {
      const startMs = utcMsFromYmdAndHhmm(date, startTimeRaw);
      const endMs = utcMsFromYmdAndHhmm(endDate, endTimeRaw);
      if (startMs > endMs) {
        errors.end_time = ["終了日時は開始日時以降にしてください"];
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  await ensureUserCanEditCalendar(calendarId);

  const startTime = isAllDay ? null : (startTimeRaw ? `${startTimeRaw}:00` : null);
  const endTime = isAllDay ? null : (endTimeRaw ? `${endTimeRaw}:00` : null);

  const upsertPayload: CalendarScheduleUpsertInput = {
    id: idRaw || undefined,
    date,
    end_date: endDate || null,
    is_all_day: isAllDay,
    start_time: startTime,
    end_time: endTime,
    title,
    kind,
    visibility: null,
    color_id: colorId,
    memo,
  };

  let before: Awaited<ReturnType<typeof getScheduleByIdInCalendar>> = null;
  if (idRaw) {
    before = await getScheduleByIdInCalendar(calendarId, idRaw);
    if (!before) {
      return { ok: false, errors: { id: ["予定が見つかりません"] } };
    }
  }

  await rpcCalendarScheduleApplyUpsertUndo(calendarId, before, upsertPayload);

  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

type ShiftCalendarScheduleMode = "move" | "copy";

/**
 * 予定（calendar_schedules）の開始日時を指定して移動/コピーする。
 * duration（開始〜終了の差分）を維持して、end_date/end_time も再計算する。
 */
export async function shiftCalendarSchedule(
  calendarId: string,
  scheduleId: string,
  mode: ShiftCalendarScheduleMode,
  newStartDate: string,
  newStartTime: string | null
): Promise<void> {
  "use server";

  if (!calendarId || !scheduleId) return;
  if (mode !== "move" && mode !== "copy") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) return;

  await ensureUserCanEditCalendar(calendarId);

  const existing = await getScheduleByIdInCalendar(calendarId, scheduleId);
  if (!existing) return;

  const msPerDay = 24 * 60 * 60 * 1000;

  const startDate = existing.date;
  const endDate = existing.end_date ?? existing.date;

  if (existing.is_all_day) {
    const startMs = Date.UTC(
      parseYMD(startDate).y,
      parseYMD(startDate).mo - 1,
      parseYMD(startDate).da,
      0,
      0,
      0
    );
    const endMs = Date.UTC(
      parseYMD(endDate).y,
      parseYMD(endDate).mo - 1,
      parseYMD(endDate).da,
      0,
      0,
      0
    );
    const durationDays = Math.round((endMs - startMs) / msPerDay) + 1;

    const newStartMs = Date.UTC(
      parseYMD(newStartDate).y,
      parseYMD(newStartDate).mo - 1,
      parseYMD(newStartDate).da,
      0,
      0,
      0
    );
    const newEndMs = newStartMs + (durationDays - 1) * msPerDay;

    const computedEndDate = formatYmdUtc(newEndMs);
    const endDateForRow = computedEndDate === newStartDate ? null : computedEndDate;

    const allDayPayload: CalendarScheduleUpsertInput = {
      id: mode === "move" ? existing.id : undefined,
      date: newStartDate,
      end_date: endDateForRow,
      is_all_day: true,
      start_time: null,
      end_time: null,
      title: existing.title,
      kind: existing.kind,
      visibility: existing.visibility ?? null,
      color_id: existing.color_id,
      memo: existing.memo,
    };
    if (mode === "copy") {
      await rpcCalendarScheduleApplyUpsertUndo(calendarId, null, {
        ...allDayPayload,
        id: undefined,
      });
    } else {
      await rpcCalendarScheduleApplyUpsertUndo(calendarId, existing, allDayPayload);
    }
    revalidatePath("/dashboard/calendar");
    return;
  }

  if (!newStartTime || !/^\d{2}:\d{2}$/.test(newStartTime)) return;
  if (!existing.start_time || !existing.end_time) return;

  const existingStartMs = utcMsFromYmdAndHhmm(startDate, existing.start_time);
  const existingEndMs = utcMsFromYmdAndHhmm(endDate, existing.end_time);
  const durationMs = existingEndMs - existingStartMs;
  if (durationMs < 0) return;

  const newStartMs = utcMsFromYmdAndHhmm(newStartDate, newStartTime);
  const newEndMs = newStartMs + durationMs;

  const computedEndDate = formatYmdUtc(newEndMs);
  const endDateForRow = computedEndDate === newStartDate ? null : computedEndDate;
  const computedEndTime = formatHhmmUtc(newEndMs);

  const timedPayload: CalendarScheduleUpsertInput = {
    id: mode === "move" ? existing.id : undefined,
    date: newStartDate,
    end_date: endDateForRow,
    is_all_day: false,
    start_time: `${newStartTime}:00`,
    end_time: `${computedEndTime}:00`,
    title: existing.title,
    kind: existing.kind,
    visibility: existing.visibility ?? null,
    color_id: existing.color_id,
    memo: existing.memo,
  };
  if (mode === "copy") {
    await rpcCalendarScheduleApplyUpsertUndo(calendarId, null, {
      ...timedPayload,
      id: undefined,
    });
  } else {
    await rpcCalendarScheduleApplyUpsertUndo(calendarId, existing, timedPayload);
  }
  revalidatePath("/dashboard/calendar");
}

export async function resizeCalendarSchedule(
  calendarId: string,
  scheduleId: string,
  edge: "start" | "end",
  newDate: string,
  newTime: string
): Promise<void> {
  "use server";

  if (!calendarId || !scheduleId) return;
  if (edge !== "start" && edge !== "end") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
  if (!/^\d{2}:\d{2}$/.test(newTime)) return;

  await ensureUserCanEditCalendar(calendarId);

  const existing = await getScheduleByIdInCalendar(calendarId, scheduleId);
  if (!existing || existing.is_all_day) return;
  if (!existing.start_time || !existing.end_time) return;

  const startDate = existing.date;
  const endDate = existing.end_date ?? existing.date;
  const existingStartMs = utcMsFromYmdAndHhmm(startDate, existing.start_time);
  const existingEndMs = utcMsFromYmdAndHhmm(endDate, existing.end_time);
  if (existingEndMs <= existingStartMs) return;

  const minDurationMs = 15 * 60 * 1000;

  let newStartMs = existingStartMs;
  let newEndMs = existingEndMs;

  if (edge === "start") {
    newStartMs = utcMsFromYmdAndHhmm(newDate, `${newTime}:00`);
    if (newStartMs >= existingEndMs || existingEndMs - newStartMs < minDurationMs) return;
  } else {
    newEndMs = utcMsFromYmdAndHhmm(newDate, `${newTime}:00`);
    if (newEndMs <= existingStartMs || newEndMs - existingStartMs < minDurationMs) return;
  }

  const newDateStart = formatYmdUtc(newStartMs);
  const newDateEnd = formatYmdUtc(newEndMs);
  const endDateForRow = newDateEnd === newDateStart ? null : newDateEnd;

  const payload: CalendarScheduleUpsertInput = {
    id: existing.id,
    date: newDateStart,
    end_date: endDateForRow,
    is_all_day: false,
    start_time: `${formatHhmmUtc(newStartMs)}:00`,
    end_time: `${formatHhmmUtc(newEndMs)}:00`,
    title: existing.title,
    kind: existing.kind,
    visibility: existing.visibility ?? null,
    color_id: existing.color_id,
    memo: existing.memo,
  };

  await rpcCalendarScheduleApplyUpsertUndo(calendarId, existing, payload);
  revalidatePath("/dashboard/calendar");
}

export async function deleteCalendarSchedule(
  calendarId: string,
  scheduleId: string
): Promise<void> {
  "use server";
  if (!calendarId || !scheduleId) return;
  await ensureUserCanEditCalendar(calendarId);
  await rpcCalendarScheduleApplyDeleteUndo(calendarId, scheduleId);
  revalidatePath("/dashboard/calendar");
}

export async function undoCalendarScheduleChange(calendarId: string): Promise<void> {
  "use server";
  if (!calendarId) return;
  await ensureUserCanEditCalendar(calendarId);
  await rpcCalendarScheduleUndo(calendarId);
  revalidatePath("/dashboard/calendar");
}

export async function redoCalendarScheduleChange(calendarId: string): Promise<void> {
  "use server";
  if (!calendarId) return;
  await ensureUserCanEditCalendar(calendarId);
  await rpcCalendarScheduleRedo(calendarId);
  revalidatePath("/dashboard/calendar");
}
