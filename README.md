# IRIAM だんごスケジュール（Rank-Calendar-App）

**IRIAM ライバー向けの非公式ランク管理ツール**です。デイリーランクの「目標+ / 実績+」、ボーダー（+2/+4/+6）、スキップパス使用日、イベント等を日別に記録し、カレンダーとデータ表で一元管理できます。

- **技術**: Next.js 16 (App Router) / React 19 / Tailwind CSS v4 / Mantine / Supabase (Auth + Postgres) / Vitest / Playwright / Sentry（任意）
- **ドキュメント**: `docs/README.md` から全体像を参照

---

## セットアップ（ローカル開発）

### 1) 依存関係

```bash
npm install
```

### 2) 環境変数

`.env.example` を参考に `.env.local` を作成し、Supabase の値を設定します。

- **必須**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **任意**
  - `SUPABASE_SERVICE_ROLE_KEY`（招待リンクの検証など、RLS を超える読み取りが必要な場合）
  - `NEXT_PUBLIC_APP_URL`（本番 OAuth リダイレクト用）
  - `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`（Sentry を有効にする場合）

### 3) 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

---

## Supabase（DB / 認証）

- **マイグレーション**: `supabase/README.md` を参照（`supabase db push` で未適用分を一括適用）
- **スキーマ**: `iriam`（主要テーブル: `calendars`, `schedule_entries`, `events`, `calendar_rank_state` ほか）

---

## スクリプト

- **開発**: `npm run dev`
- **ビルド**: `npm run build`
- **Lint**: `npm run lint`
- **ユニットテスト**: `npm run test` / `npm run test:run`
- **カバレッジ**: `npm run test:coverage`
- **E2E**: `npm run test:e2e`（初回は `npx playwright install chromium`）
- **環境変数検証**: `npm run validate-env`

---

## ドキュメント

- **概要**: `docs/overview.md`
- **機能要件**: `docs/functional-requirements.md`
- **設計**: `docs/design.md`
- **CI**: `docs/ci.md`
- **本番前チェック**: `docs/production-checklist.md`
