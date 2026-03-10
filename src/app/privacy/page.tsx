export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background px-4 py-12 text-sm text-zinc-800 dark:text-zinc-200">
      <h1 className="text-xl font-semibold">プライバシーポリシー</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        最終更新日: 2026-03-10（暫定版）
      </p>
      <p>
        本サービスは、IRIAMライバー・リスナー向けの非公式スケジュール管理ツールです。以下の方針に従い、利用者の
        プライバシー保護に努めます。
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          本サービスは、認証のために Supabase
          Auth（Google、Discord、メールリンク）を利用します。
        </li>
        <li>
          IRIAM
          のアカウント情報とは連携せず、IRIAM運営会社とも一切関係がありません。
        </li>
        <li>
          OCRでアップロードされた画像はブラウザ内でのみ処理され、サーバーには送信・保存されません。
        </li>
        <li>アクセス解析やトラッキングツールは使用しません。</li>
      </ul>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        ※正式版リリース前に、必要に応じて条文を拡充・更新します。
      </p>
    </div>
  );
}

