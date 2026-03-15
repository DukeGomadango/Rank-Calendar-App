import Link from "next/link";

const ORBS = [
  { className: "top-10 left-[5%] w-56 h-56 sm:w-72 sm:h-72", gradient: "from-accent-400/70 to-accent-300/50" },
  { className: "top-1/3 right-[8%] w-44 h-44 sm:w-60 sm:h-60", gradient: "from-accent-300/60 to-accent-500/40" },
  { className: "bottom-24 left-[12%] w-40 h-40 sm:w-52 sm:h-52", gradient: "from-accent-500/50 to-accent-400/35" },
  { className: "top-1/2 left-[50%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96", gradient: "from-accent-400/40 via-accent-300/30 to-transparent" },
  { className: "bottom-12 right-[15%] w-44 h-44 sm:w-60 sm:h-60", gradient: "from-accent-500/45 to-accent-400/35" },
  { className: "top-20 right-[35%] w-32 h-32 sm:w-44 sm:h-44", gradient: "from-accent-300/55 to-accent-400/35" },
  { className: "bottom-32 left-[40%] w-36 h-36 sm:w-48 sm:h-48", gradient: "from-accent-400/50 to-accent-500/30" },
  { className: "top-1/4 right-[20%] w-24 h-24 sm:w-32 sm:h-32", gradient: "from-white/40 to-white/10" },
  { className: "bottom-1/3 left-[25%] w-20 h-20 sm:w-28 sm:h-28", gradient: "from-amber-200/30 to-orange-200/20" },
];

export function Hero() {
  return (
    <section className="relative z-0 overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      {/* ヒーロー用の濃い青グラデーション背景 */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-accent-500 via-accent-400 to-accent-300/90 dark:from-accent-800 dark:via-accent-700 dark:to-accent-900/90"
        aria-hidden
      />
      {/* 上部のラジアル（彩度やや高めでポップに） */}
      <div
        className="absolute inset-0 -z-10 dark:hidden"
        style={{
          background: "radial-gradient(ellipse 100% 80% at 50% -20%, #0ea5e9 0%, #38bdf8 30%, #7dd3fc 55%, transparent 80%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 hidden dark:block"
        style={{
          background: "radial-gradient(ellipse 100% 80% at 50% -20%, #0369a1 0%, #075985 40%, transparent 75%)",
        }}
        aria-hidden
      />

      {/* オーブ（散らした光の玉・はっきり見えるように） */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className={`absolute -z-[5] rounded-full bg-gradient-to-br ${orb.gradient} blur-3xl opacity-85 pointer-events-none dark:opacity-70 ${orb.className}`}
          aria-hidden
        />
      ))}

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* 左: ヒーローテキスト（大見出しは白、本文は濃いネイビーで可読性確保） */}
          <div className="rounded-2xl border border-white/25 bg-white/10 p-6 backdrop-blur-md dark:border-white/15 dark:bg-white/5 sm:p-8">
            <p
              className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
            >
              IRIAM だんごスケジュール（非公式）
            </p>
            <h1
              className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.15)" }}
            >
              IRIAMのランク管理を、<span className="text-white">ひとつに。</span>
            </h1>
            <p
              className="mt-6 max-w-xl text-lg leading-relaxed text-slate-900 dark:text-slate-100"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
            >
              デイリーランクの目標+・実績+、ボーダー、スキップパスを日別に記録。
              カレンダーとデータ表でスケジュールを一元管理できる、IRIAMライバー向けのツールです。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-amber-400 px-8 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300 dark:bg-amber-400 dark:text-slate-900 dark:hover:bg-amber-300 sm:flex-initial"
              >
                無料ではじめる
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full border-2 border-slate-800 px-8 text-base font-medium text-slate-900 transition hover:bg-white/20 dark:border-slate-300 dark:text-slate-100 dark:hover:bg-white/15 sm:flex-initial"
              >
                ログイン
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-800 dark:text-slate-200">
              当サービスは非公式のスケジュール管理ツールであり、IRIAM運営会社とは関係ありません。
            </p>
          </div>

          {/* 右: 大きめのツール風モック（IRIAM用語で自分ごと化） */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-md overflow-hidden rounded-xl border-2 border-white/30 bg-white/95 shadow-2xl ring-1 ring-black/5 dark:border-white/20 dark:bg-zinc-800/95 sm:max-w-lg">
              <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-zinc-100/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-700/50">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-zinc-400" />
                  <div className="h-2 w-2 rounded-full bg-zinc-400" />
                  <div className="h-2 w-2 rounded-full bg-zinc-400" />
                </div>
                <div className="ml-2 flex-1 rounded-md bg-white px-2 py-1 text-[10px] text-zinc-400 dark:bg-zinc-600 dark:text-zinc-400">
                  iriam-rank-planner / カレンダー
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">2025年3月</span>
                  <span className="text-xs text-zinc-500">‹ ›</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                    <div key={d} className="py-1 font-medium text-zinc-500 dark:text-zinc-400">
                      {d}
                    </div>
                  ))}
                  {[null, null, null, null, null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].slice(0, 35).map((d, i) => (
                    <div
                      key={i}
                      className={`flex min-h-[26px] items-center justify-center rounded ${d == null ? "bg-transparent" : i === 16 ? "bg-accent-500 font-semibold text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-300"}`}
                    >
                      {d ?? ""}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700/40">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">今日</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">目標+2 実績+2</span>
                    <span className="rounded bg-accent-500/25 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:text-accent-300">+4</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200/80 bg-amber-50/80 px-3 py-2 dark:border-zinc-600 dark:bg-amber-900/20">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">スキップパス</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">使用済</span>
                    <span className="ml-auto rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300">ボーダー +6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
