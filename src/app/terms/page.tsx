import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background px-4 py-12 text-sm text-zinc-800 dark:text-zinc-200">
      <h1 className="text-xl font-semibold">利用規約</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        最終更新日: 2026-03-16
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第1条（サービス定義）</h2>
        <p>
          本サービス（以下「本サービス」）は、IRIAM
          ライバー・リスナー向けの非公式スケジュール管理ツールです。デイリーランクの目標・実績、スキップパス、ボーダー値などをカレンダーおよびデータ表で管理する機能を提供します。本サービスは
          IRIAM 運営会社とは一切関係がなく、公式なサポート・保証は提供しません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第2条（利用条件）</h2>
        <p>
          本サービスを利用することで、ユーザーは本規約に同意したものとみなします。本サービスは、Supabase
          Auth による認証（メールリンク、Google、Discord 等）を利用します。アカウントの管理責任はユーザーにあり、第三者による利用が発覚した場合でも運営者は責任を負いません。
        </p>
        <p>
          未成年者の方が利用する場合は、保護者の同意を得たうえでご利用ください。保護者の同意を得ずに利用した場合、当該利用に起因する問題について、運営者は責任を負いません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第3条（禁止行為）</h2>
        <p>ユーザーは、以下の行為を行ってはなりません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>法令または公序良俗に反する目的での利用</li>
          <li>本サービスの運営・ネットワークを妨害する行為</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>本サービスの一部を逆コンパイル・改変・再配布する等、許諾なく利用する行為</li>
        </ul>
        <p>
          運営者は、ユーザーが前項の禁止行為に該当すると判断した場合、事前の通知なくアカウントの利用停止・削除その他の措置を講ずることができるものとします。これによりユーザーに損害が生じた場合でも、運営者は責任を負いません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第4条（コンテンツ・データの取り扱い）</h2>
        <p>
          ユーザーが本サービスに登録したスケジュール・ランク・イベント・招待・共有設定等のデータ（以下「ユーザーデータ」）について、ユーザーはその権利を有します。運営者は、本サービスの提供・改善・不正利用対応のために必要な範囲でユーザーデータを保存・処理します。ユーザーはアカウント削除等により、ユーザーデータが削除される場合があることを了承するものとします。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第5条（免責）</h2>
        <p>
          本サービスは非公式ツールであり、株式会社IRIAM（IRIAM の運営会社）およびその親会社である株式会社ディー・エヌ・エー（DeNA）とは一切関係がありません。IRIAM
          のランク変動・イベント結果・ボーダー等の正確性を保証しません。ランクやイベント情報は必ず公式アプリ・公式発表で確認してください。本サービスの利用により生じた損害（データ消失、ランク誤認、第三者とのトラブル等を含む）について、運営者は一切の責任を負いません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第6条（サービスの変更・停止）</h2>
        <p>
          運営者は、予告なく本サービスの内容変更・一時停止・終了を行うことができます。これによりユーザーに損害が生じた場合でも、運営者は責任を負いません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第7条（規約の変更）</h2>
        <p>
          運営者は、本規約を変更することがあります。変更した場合は、本サービス上での告知または適宜の方法で通知し、効力発生日以降に本サービスを利用したユーザーは変更後の規約に同意したものとみなします。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">第8条（準拠法・管轄）</h2>
        <p>
          本規約は日本法に準拠し、本サービスに関する紛争については、運営者の本拠地を管轄する裁判所を第一審の専属的合意管轄とします。
        </p>
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/privacy" className="underline hover:no-underline">
          プライバシーポリシー
        </Link>
        は別途定めます。
      </p>
    </div>
  );
}
