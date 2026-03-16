"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  resetCalendarData,
  deleteMyAccountAndUser,
} from "@/app/(dashboard)/dashboard/settings/actions";

type Props = {
  calendarId: string;
  isMock: boolean;
};

export function DangerZoneSection({ calendarId, isMock }: Props) {
  const router = useRouter();
  const [resetPending, setResetPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleResetData() {
    if (isMock) return;
    if (
      !confirm(
        "このカレンダーのスケジュールデータをすべて削除します。この操作は取り消せません。よろしいですか？"
      )
    ) {
      return;
    }
    setResetPending(true);
    try {
      const result = await resetCalendarData(calendarId);
      if (!result.ok) {
        alert(result.error ?? "初期化に失敗しました");
        return;
      }
      alert("カレンダーデータを初期化しました。");
      router.refresh();
    } finally {
      setResetPending(false);
    }
  }

  function openDeleteModal() {
    if (isMock) return;
    setShowDeleteModal(true);
  }

  async function handleDeleteAccountConfirm() {
    setDeletePending(true);
    try {
      const result = await deleteMyAccountAndUser();
      if (!result.ok) {
        alert(result.error ?? "データの削除に失敗しました");
        setDeletePending(false);
        setShowDeleteModal(false);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      alert("エラーが発生しました");
      setDeletePending(false);
      setShowDeleteModal(false);
    }
  }

  if (isMock) {
    return (
      <section className="space-y-3 rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
        <h2 className="text-xs font-semibold text-red-800 dark:text-red-200">
          ⚠ デンジャーゾーン
        </h2>
        <p className="text-[11px] text-red-700 dark:text-red-300">
          開発用モックでは実行できません。
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
      <h2 className="text-xs font-semibold text-red-800 dark:text-red-200">
        ⚠ デンジャーゾーン
      </h2>
      <p className="text-[11px] text-red-700 dark:text-red-300">
        以下の操作は取り消せません。十分にご確認のうえ実行してください。
      </p>
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-[11px] font-medium text-red-800 dark:text-red-200">
            カレンダーデータの初期化
          </p>
          <p className="mb-1.5 text-[11px] text-red-700 dark:text-red-300">
            このカレンダーのスケジュール（目標・実績・メモなど）をすべて削除します。ランク設定は残ります。
          </p>
          <button
            type="button"
            onClick={handleResetData}
            disabled={resetPending}
            className="rounded-md border border-red-400 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
          >
            {resetPending ? "実行中…" : "カレンダーデータを初期化"}
          </button>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium text-red-800 dark:text-red-200">
            アカウントの削除（退会）
          </p>
          <p className="mb-1.5 text-[11px] text-red-700 dark:text-red-300">
            すべてのカレンダーとデータを削除し、ログアウトします。この操作は取り消せません。
          </p>
          <button
            type="button"
            onClick={openDeleteModal}
            disabled={deletePending}
            className="rounded-md bg-red-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
          >
            アカウントを削除
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          onClick={() => !deletePending && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-account-modal-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              本当に削除しますか？
            </h3>
            <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
              すべてのカレンダーとデータが削除され、復元できません。この操作は取り消せません。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !deletePending && setShowDeleteModal(false)}
                disabled={deletePending}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={deletePending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {deletePending ? "実行中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
