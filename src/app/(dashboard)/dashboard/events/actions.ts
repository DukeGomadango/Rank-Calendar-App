import { revalidatePath } from "next/cache";

import {
  createEventForCalendar,
  deleteEvent,
} from "@/lib/data/events";

const EVENTS_PATH = "/dashboard/events";

export async function createEvent(formData: FormData) {
  "use server";

  const calendarId = formData.get("calendar_id");
  const name = formData.get("name");
  const startDate = formData.get("start_date");
  const endDate = formData.get("end_date");

  if (typeof calendarId !== "string" || !calendarId) {
    throw new Error("カレンダーIDが不正です。");
  }
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("イベント名を入力してください。");
  }

  await createEventForCalendar(
    calendarId,
    name.trim(),
    typeof startDate === "string" && startDate !== "" ? startDate : null,
    typeof endDate === "string" && endDate !== "" ? endDate : null
  );

  revalidatePath(EVENTS_PATH);
}

/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopCreateEvent(_formData: FormData) {
  "use server";
}

/** 開発用モック表示用。何もしないサーバーアクション。 */
export async function noopDeleteEventAction(_formData: FormData) {
  "use server";
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

  await deleteEvent(id, calendarId);

  revalidatePath(EVENTS_PATH);
}
