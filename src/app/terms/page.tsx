export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background px-4 py-12 text-sm text-zinc-800 dark:text-zinc-200">
      <h1 className="text-xl font-semibold">利用規約</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        最終更新日: 2026-03-10（暫定版）
      </p>
      <p>
        本サービス（以下、「本サービス」といいます）は、IRIAM
        ライバー・リスナー向けの非公式スケジュール管理ツールです。本サービスを利用することで、ユーザーは以下の内容に同意したものとみなします。
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          本サービスは IRIAM
          運営会社とは一切関係がなく、公式なサポート・保証等は提供しません。
        </li>
        <li>
          本サービスの利用により生じた損害について、運営者は一切の責任を負いません。ランク変動やイベント結果等は必ず公式アプリで確認してください。
        </li>
        <li>
          ユーザーは、法令や公序良俗に反する目的で本サービスを利用してはなりません。
        </li>
        <li>
          運営者は、予告なく本サービスの内容変更・停止・終了を行うことができます。
        </li>
      </ul>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        ※正式版リリース前に、必要に応じて条文を拡充・更新します。
      </p>
    </div>
  );
}

