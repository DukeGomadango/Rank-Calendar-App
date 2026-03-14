import { redirect } from "next/navigation";

/** イベント機能は /dashboard/events に移管済み。旧URLからリダイレクト。 */
export default function EventsSettingsRedirect() {
  redirect("/dashboard/events");
}
