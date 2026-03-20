import { revalidatePath } from "next/cache";

import { ensureUserCanEditCalendar } from "@/lib/auth/permission";
import type { EventType } from "@/lib/data/events";
import { createEventForCalendar, deleteEvent, updateEventForCalendar } from "@/lib/data/events";

const EVENTS_PATH = "/dashboard/events";

const EVENT_TYPES: EventType[] = ["ranking", "achievement", "background", "other"];

function parseEventType(v: FormDataEntryValue | null): EventType | null {
  if (typeof v !== "string" || v === "") return null;
  if (EVENT_TYPES.includes(v as EventType)) return v as EventType;
  return null;
}

export async function createEvent(formData: FormData) {
  "use server";

  const calendarId = formData.get("calendar_id");
  const name = formData.get("name");
  const startDate = formData.get("start_date");
  const endDate = formData.get("end_date");
  const color = formData.get("color");
  const eventType = formData.get("event_type");

  if (typeof calendarId !== "string" || !calendarId) {
    throw new Error("カレンダーIDが不正です。");
  }
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("イベント名を入力してください。");
  }

  await ensureUserCanEditCalendar(calendarId);

  await createEventForCalendar(
    calendarId,
    name.trim(),
    typeof startDate === "string" && startDate !== "" ? startDate : null,
    typeof endDate === "string" && endDate !== "" ? endDate : null,
    typeof color === "string" && color !== "" ? color : null,
    parseEventType(eventType)
  );

  revalidatePath(EVENTS_PATH);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
}

export async function updateEvent(formData: FormData) {
  "use server";

  const calendarId = formData.get("calendar_id");
  const id = formData.get("id");
  const name = formData.get("name");
  const startDate = formData.get("start_date");
  const endDate = formData.get("end_date");
  const color = formData.get("color");
  const eventType = formData.get("event_type");

  if (typeof calendarId !== "string" || !calendarId) {
    throw new Error("カレンダーIDが不正です。");
  }
  if (typeof id !== "string" || !id) {
    throw new Error("イベントIDが不正です。");
  }
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("イベント名を入力してください。");
  }

  await ensureUserCanEditCalendar(calendarId);

  await updateEventForCalendar(id, calendarId, {
    name: name.trim(),
    startDate: typeof startDate === "string" && startDate !== "" ? startDate : null,
    endDate: typeof endDate === "string" && endDate !== "" ? endDate : null,
    color: typeof color === "string" && color !== "" ? color : null,
    eventType: parseEventType(eventType),
  });

  revalidatePath(EVENTS_PATH);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
}

/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopCreateEvent(_formData: FormData) {
  "use server";
  void _formData;
}

/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopDeleteEventAction(_formData: FormData) {
  "use server";
  void _formData;
}

/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopUpdateEventAction(_formData: FormData) {
  "use server";
  void _formData;
}

export async function deleteEventAction(formData: FormData) {
  "use server";

  const calendarId = formData.get("calendar_id");
  const id = formData.get("id");

  if (typeof calendarId !== "string" || !calendarId) {
    throw new Error("カレンダーIDが不正です。");
  }
  if (typeof id !== "string" || !id) {
    throw new Error("イベントIDが不正です。");
  }

  await ensureUserCanEditCalendar(calendarId);

  await deleteEvent(id, calendarId);

  revalidatePath(EVENTS_PATH);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/data");
}
