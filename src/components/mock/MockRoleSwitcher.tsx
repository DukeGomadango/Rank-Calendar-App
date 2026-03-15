"use client";

import { useRouter } from "next/navigation";
import { MOCK_ROLE_COOKIE } from "@/lib/auth/mock-role-cookie";

const COOKIE_PATH = "path=/";
const COOKIE_MAX_AGE = "max-age=31536000"; // 1年

function setMockRole(role: "owner" | "listener") {
  document.cookie = `${MOCK_ROLE_COOKIE}=${role}; ${COOKIE_PATH}; ${COOKIE_MAX_AGE}`;
}

type Props = {
  currentRole: "owner" | "listener";
};

export function MockRoleSwitcher({ currentRole }: Props) {
  const router = useRouter();

  function handleSwitch(role: "owner" | "listener") {
    setMockRole(role);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50/90 px-2 py-1 text-[10px] dark:border-amber-700 dark:bg-amber-950/40">
      <span className="font-medium text-amber-800 dark:text-amber-200">モック:</span>
      <button
        type="button"
        onClick={() => handleSwitch("owner")}
        className={`rounded px-1.5 py-0.5 font-medium ${currentRole === "owner" ? "bg-amber-400 text-amber-950 dark:bg-amber-600 dark:text-amber-100" : "text-amber-700 hover:bg-amber-200/80 dark:text-amber-300 dark:hover:bg-amber-800/60"}`}
      >
        オーナー
      </button>
      <button
        type="button"
        onClick={() => handleSwitch("listener")}
        className={`rounded px-1.5 py-0.5 font-medium ${currentRole === "listener" ? "bg-amber-400 text-amber-950 dark:bg-amber-600 dark:text-amber-100" : "text-amber-700 hover:bg-amber-200/80 dark:text-amber-300 dark:hover:bg-amber-800/60"}`}
      >
        リスナー
      </button>
    </div>
  );
}
