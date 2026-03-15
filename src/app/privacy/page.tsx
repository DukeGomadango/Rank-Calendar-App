import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background px-4 py-12 text-sm text-zinc-800 dark:text-zinc-200">
      <h1 className="text-xl font-semibold">プライバシーポリシー</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        最終更新日: 2026-03-16
      </p>

      <p>
        本サービスは、IRIAM
        ライバー・リスナー向けの非公式スケジュール管理ツールです。以下の方針に従い、利用者のプライバシー保護に努めます。
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">1. 取得する情報</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>認証情報</strong>
            … 本サービスは Supabase Auth を利用します。メールアドレス、OAuth
            プロバイダ（Google・Discord 等）から提供される識別子および表示名を認証・アカウント表示に利用します。
          </li>
          <li>
            <strong>表示名</strong>
            … ユーザーが設定した表示名をプロフィールおよび共有先での表示に利用します。
          </li>
          <li>
            <strong>スケジュール・ランク・招待・共有関連データ</strong>
            … カレンダー、日別の目標・実績・ボーダー・スキップパス、イベント、招待リンク、共有ロール等のデータをサービス提供のために保存・表示します。
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">2. 利用目的</h2>
        <p>
          上記情報は、本サービスの提供（認証、データの保存・表示・共有機能の運営）、サポート対応、不正利用・規約違反への対応のために利用します。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">3. 保存場所・期間</h2>
        <p>
          データは Supabase（本サービスが利用するクラウドサービス）上に保存されます。保存期間は、アカウント削除または該当データの削除操作を行うまでとし、削除後は復元できません。バックアップ等により一定期間残る可能性があります。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">4. 第三者提供</h2>
        <p>
          法令に基づく場合を除き、ユーザーの同意なく個人を特定できる情報を第三者に提供しません。認証は Supabase Auth、ホスティングはデプロイ先（例: Vercel）のサービスを利用しており、これらの事業者がデータを処理する場合があります。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">5. OCR・画像について</h2>
        <p>
          ボーダー読み取り用の OCR
          機能では、画像はブラウザ内（クライアント側）でのみ処理され、サーバーには送信・保存されません。画像データが当方のサーバーに保存されることはありません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">6. Cookie・ローカルストレージ</h2>
        <p>
          認証セッションの維持のため、Supabase Auth が Cookie を使用します。テーマ（ダークモード等）の設定を保持するため、ローカルストレージを使用している場合があります。アクセス解析・トラッキング用の Cookie は使用していません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">7. お問い合わせ</h2>
        <p>
          本ポリシーや個人情報の取り扱いに関するお問い合わせは、本サービス内の告知または
          GitHub リポジトリの Issue 等、運営者が指定する窓口までご連絡ください。
        </p>
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/terms" className="underline hover:no-underline">
          利用規約
        </Link>
        は別途定めます。
      </p>
    </div>
  );
}
