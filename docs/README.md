# Rank-Calendar-App ドキュメント

このフォルダには、**IRIAM だんごスケジュール**（本アプリ）の概要・機能要件・設計思想をまとめた資料を格納しています。

---

## このアプリは何か（要約）

**IRIAM だんごスケジュール** は、**IRIAM ライバー向けの非公式ランク管理ツール**です。

- **目的**: デイリーランクの「目標+」「実績+」、ボーダー（+2/+4/+6）、スキップパス使用日を日別に記録し、カレンダーとデータ表で一元管理する。
- **対象ユーザー**: IRIAM で配信するライバー、およびリスナー（共有・閲覧用）。
- **位置づけ**: IRIAM 運営会社とは無関係の**非公式**ツール。ライバーが自分用にスケジュールとランク進捗を管理し、必要に応じてリスナーへ共有するための Web アプリです。

詳細は [overview.md](./overview.md) を参照してください。

---

## ドキュメント一覧

| ドキュメント | 内容 |
|-------------|------|
| [overview.md](./overview.md) | アプリの目的・対象ユーザー・位置づけ・用語の説明 |
| [functional-requirements.md](./functional-requirements.md) | 機能要件・画面一覧・ユースケース・非機能要件 |
| [design.md](./design.md) | 設計思想・アーキテクチャ・技術スタック・データモデル・フォルダ構成 |
| [ci.md](./ci.md) | CI の構成・実行内容・E2E の条件実行（secrets 依存） |
| [production-checklist.md](./production-checklist.md) | 本番デプロイ前のチェック項目（Supabase / ビルド / 監視など） |
| [security-audit.md](./security-audit.md) | セキュリティ観点の監査メモ（RLS など） |
| [supabase-email-templates.md](./supabase-email-templates.md) | Supabase Auth のメールテンプレート集 |
| [tech-debt.md](./tech-debt.md) | 技術的負債の台帳（優先度・対応方針・進捗） |

---

## クイックリファレンス

- **技術スタック**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Mantine, Supabase（認証・PostgreSQL）, dayjs, holiday-jp, @tanstack/react-table, SWR, Zod, tesseract.js（OCR）, Sentry（任意）
- **主要ルート**: `/`（ランディング）, `/dashboard`（ホーム）, `/dashboard/calendar`, `/dashboard/data`, `/dashboard/events`, `/dashboard/sharing`, `/dashboard/settings`。旧URL `/dashboard/settings/events`, `/dashboard/settings/sharing` はそれぞれ `/dashboard/events`, `/dashboard/sharing` へリダイレクト。
- **テーマ**: ライト/ダーク/システム切替（localStorage `iriam-theme`）。ルートレイアウトで ThemeProvider を利用。
- **DB スキーマ**: Supabase の `iriam` スキーマ（`calendars`, `schedule_entries`, `events`, `calendar_rank_state`, 共有・招待関連テーブル）
