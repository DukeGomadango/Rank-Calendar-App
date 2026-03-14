import { redirect } from "next/navigation";

/** 共有機能は /dashboard/sharing に移管済み。旧URLからリダイレクト。 */
export default function SharingSettingsRedirect() {
  redirect("/dashboard/sharing");
}
