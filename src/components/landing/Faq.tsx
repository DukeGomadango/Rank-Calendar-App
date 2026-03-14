"use client";

import { useState } from "react";

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "IRIAM公式のサービスですか？",
    a: "いいえ。当サービスは非公式のスケジュール管理ツールであり、IRIAM運営会社とは一切関係ありません。IRIAMライバーがデイリーランクや配信スケジュールを自分で管理するためのツールです。",
  },
  {
    q: "どんなデータを管理できますか？",
    a: "日付ごとの目標+・実績+、+2/+4/+6のボーダー、スキップパス使用有無、参加イベント、メモなどを登録できます。カレンダー表示とデータ表表示で切り替えて確認・編集できます。",
  },
  {
    q: "リスナーにスケジュールを共有できますか？",
    a: "はい。共有タブでロールを作成し、招待リンクを発行できます。ロールごとに「カレンダーを見せる」「表を見せる」などの権限を設定でき、簡易表示・詳細表示の切り替えも可能です。",
  },
  {
    q: "OCRで読み込んだ画像はサーバーに送信されますか？",
    a: "いいえ。画像の読み取りはブラウザ内でのみ行われ、サーバーには送信・保存されません。プライバシーを重視した設計です。",
  },
  {
    q: "利用料金はかかりますか？",
    a: "現時点では無料でご利用いただけます。アカウントを作成すれば、登録から共有まで一通り利用できます。",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="border-t border-zinc-200/80 px-4 py-20 sm:px-6 sm:py-28" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            よくある質問
          </h2>
        </div>
        <dl className="mt-12 space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="rounded-xl bg-slate-100/90 shadow-sm dark:bg-slate-800/40 dark:shadow-zinc-900/30"
            >
              <dt>
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                  aria-expanded={openIndex === index}
                >
                  <span>{item.q}</span>
                  <span
                    className={`shrink-0 text-zinc-400 transition-transform ${openIndex === index ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    ▼
                  </span>
                </button>
              </dt>
              <dd
                className={`overflow-hidden border-t border-slate-200/60 px-5 dark:border-slate-700/50 ${
                  openIndex === index ? "block" : "hidden"
                }`}
              >
                <p className="py-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.a}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
