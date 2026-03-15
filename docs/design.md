# 設計思想・アーキテクチャ（Design）

## 設計思想

- **シンプルさ**: ランク管理に必要な機能に絞り、余計な依存を増やさない。
- **プライバシー**: OCR はクライアントのみで実行し、画像をサーバーに送らない。トラッキングを行わない。
- **権限の明確化**: カレンダー単位でオーナーと共有先を分け、ロールで「何を見せるか」を細かく制御する。
- **日付は JST 一貫**: アプリ内の日付ロジックはすべて JST（Asia/Tokyo）基準。ランク集計は**ライバーごとの集計周期**（リセット日・ランクアップでリセット）で行い、スキップ使用でリセット日が延長される。

---

## 技術スタック

| 区分 | 技術 | 備考 |
|------|------|------|
| フレームワーク | Next.js 16 (App Router) | ルーティング・SSR・Server Actions |
| UI | React 19 | |
| スタイル | Tailwind CSS v4 | PostCSS 経由 |
| BaaS / DB | Supabase | 認証（Auth）+ PostgreSQL（スキーマ `iriam`） |
| 日付 | dayjs | ロケール: ja |
| 祝日 | holiday-jp | 祝日表示用 |
| 表 UI | @tanstack/react-table | データ表タブ |
| OCR | tesseract.js | クライアントのみ。画像はサーバーに送信しない |
| テスト | Vitest | `lib/domain/*.test.ts` でドメインロジックをテスト |
| フォント | Montserrat, Noto Sans JP | next/font |

---

## アーキテクチャ概要

### レンダリング・データ取得

- **App Router**: ページは `src/app/` 配下。`(dashboard)` はレイアウトグループ（ダッシュボード共通レイアウト）。
- **Server Components 中心**: 各ページで `createSupabaseServerClient()` により認証・データ取得。クライアント状態は必要最小限。
- **Server Actions**: フォーム送信・スケジュール保存・イベント操作・共有・設定などは `"use server"` の Server Actions で実装（`dashboard/actions.ts`, `dashboard/events/actions.ts`, `dashboard/sharing/actions.ts`, `dashboard/settings/actions.ts`, `dashboard/settings/events/actions.ts`, `dashboard/settings/sharing/actions.ts`）。

### 認証・API

- **REST API**: 明示的な REST エンドポイントは `src/app/auth/callback/route.ts`（OAuth の code → session 交換）のみ。
- **その他**: Supabase クライアントの直叩き + Server Actions。RLS（Row Level Security）は Supabase 側で設定する想定。
- **Supabase クライアント**: `createSupabaseServerClient()`（Server Component 用・cookie 読み取りのみ）、`createSupabaseRouteHandlerClient()`（Route Handler / Server Action 用・cookie 読み書き可）、`createSupabaseServiceRoleClient()`（招待リンク検証など RLS を超えた操作用・サーバー専用）。
- **招待リンク検証**: サーバー側で `SUPABASE_SERVICE_ROLE_KEY` を使い、RLS を超えた操作が必要な場合はサービスロールで実行。

### クライアント側の状態

- **ThemeProvider**: テーマ（`light` / `dark` / `system`）を `localStorage`（キー: `iriam-theme`）で永続化。ルートレイアウトでラップし、初回描画前のフラッシュ防止用スクリプトで `document.documentElement` に `.dark` を付与。
- **MockScheduleProvider**: 開発時・未ログイン時のスケジュールモック。日付別のモックデータを提供。
- **ViewModeProvider**: 表示モード（`simple` / `detailed`）を `localStorage`（キー: `iriam_view_mode`）で永続化。
- **MockRoleSwitcher**: 開発時のみ。オーナー/リスナーのロール切替用（Cookie `iriam_mock_role`）。
- グローバルな Flux/Redux 等は未使用。Server Components + Server Actions + 必要に応じた Context で完結。

---

## データモデル（スキーマ `iriam`）

### 主要テーブル

| テーブル | 役割 |
|----------|------|
| **calendars** | カレンダー本体。`owner_id` でユーザーに紐づく。名前など。 |
| **schedule_entries** | 日付・カレンダーごとのスケジュール。`calendar_id` + `date` で一意。 |
| **events** | カレンダーに紐づくイベント。`calendar_id`。名前・開始日・終了日。 |
| **roles** | 共有用のロール定義。どの権限を付与するかをまとめたもの。 |
| **role_permissions** | ロールと権限の対応。`role_id` + `permission`（view_calendar 等）。 |
| **invite_links** | 招待リンク。`calendar_id`, `role_id`, トークン、有効期限など。 |
| **invite_redemptions** | 招待の利用履歴。誰がどの招待で参加したか。 |
| **shares** | ユーザーとカレンダーの共有関係。`user_id`, `calendar_id`, `role_id`。 |
| **calendar_rank_state** | カレンダーごとのランク状態。`current_rank`, `rank_cycle_start_date`, `rank_reset_date`。スキップでリセット日延長、ランクアップで新周期。 |

### schedule_entries の主なカラム

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | 主キー |
| calendar_id | uuid | カレンダー |
| date | date / text | YYYY-MM-DD（JST 想定） |
| target_plus | number? | 目標+ |
| actual_plus | number? | 実績+ |
| skip_pass_used | boolean | スキップパス使用日か |
| border_plus2, border_plus4, border_plus6 | number? | ボーダー値 |
| event_id | uuid? | 紐づくイベント |
| memo | text? | メモ |

### 権限（CalendarPermissionFlags）

- **isOwner**: オーナーかどうか。オーナーは全権限＋編集可。
- **canEditSchedule**: スケジュール編集（v1 ではオーナーのみ true）。
- **canViewCalendar**: カレンダー表示
- **canViewTable**: データ表表示
- **canViewBorders**: ボーダー（+2/+4/+6）表示
- **canViewMemo**: メモ表示
- **canViewTargetActual**: 目標+・実績+表示
- **canViewRank**: ランク情報表示
- **canViewEvents**: イベント表示

共有ユーザーは `shares` → `role_id` → `role_permissions` から上記の「View*」系フラグが決まる。編集はオーナーのみ。

---

## ドメインロジック

- **`lib/domain/calendar.ts`**: JST 日付文字列（`JstDateString`）、`toJstDateString`, `getJstWeekStart`, `compareJstDate`。
- **`lib/domain/rank.ts`**: `RankEntry`, `WeeklyRankProgress`, `RankJudgement`。`calculateWeeklyRankProgress`（月曜週ベースの後方互換用）、`calculateCycleCumulativeByDate`（集計周期内の日別累計）、`judgeCycleRank`（+18 ランクアップ / +12 キープ / 未満ダウン）。**集計周期**は `calendar_rank_state` の `rank_cycle_start_date` 〜 `rank_reset_date`。スキップ日は集計から除外。ランクアップで翌日がゼロ日目（新周期開始）。

---

## フォルダ構成（主要部分）

```
src/
├── app/
│   ├── layout.tsx                 # ルートレイアウト（フォント、metadata、JsonLd、ThemeProvider）
│   ├── page.tsx                   # ランディング
│   ├── login/, signup/
│   ├── privacy/, terms/
│   ├── auth/callback/route.ts     # OAuth コールバック
│   ├── (dashboard)/
│   │   ├── layout.tsx             # ダッシュボードレイアウト（MockScheduleProvider, ViewModeProvider, ThemeToggle, MockRoleSwitcher, サイドバー/モバイルナビ）
│   │   └── dashboard/
│   │       ├── page.tsx           # ホーム
│   │       ├── actions.ts         # スケジュール保存・ランクアップ適用・ランク設定など
│   │       ├── calendar/, data/, events/, sharing/, settings/
│   │       ├── settings/actions.ts
│   │       ├── settings/events/   # → /dashboard/events へリダイレクト
│   │       └── settings/sharing/  # → /dashboard/sharing へリダイレクト
│   └── invite/[calendarId]/[token]/  # 招待リンク
├── components/
│   ├── landing/                   # Hero, Features, HowItWorks, CtaSection, Faq, Footer, Trust, JsonLd, LandingHeader
│   ├── schedule/                  # CalendarMockWrapper, CalendarWithModal, HomeScheduleCard, ScheduleForm
│   ├── data/                      # DataTable, DataTableWithMockState, DataRangeSelect, DayDetailModal
│   ├── dashboard/                 # WeeklyPlusSummary, CurrentRankBadge, DashboardRankSection
│   ├── events/                    # EventCard, EventFormClient
│   ├── ocr/                       # BorderOcrButton
│   ├── onboarding/                # OnboardingCard
│   ├── theme/                     # ThemeToggle
│   ├── mock/                      # MockRoleSwitcher（開発時のみ）
│   └── settings/                  # ViewModeToggle, AccountSection, RankSettingsForm, DataManagementSection, DangerZoneSection, AppAboutSection
├── lib/
│   ├── supabase/                  # server.ts（createSupabaseServerClient, createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient）, client.ts
│   ├── auth/                      # permission.ts, mock-role-cookie.ts
│   ├── data/                      # calendars, schedule-entries, events, calendar-rank-state, roles, permissions, shares, invite-links, invite-redemptions, data-range.ts
│   ├── domain/                    # calendar.ts, rank.ts（＋テスト）
│   ├── theme-context.tsx
│   ├── mock-schedule-context.tsx
│   ├── mock-seed-data.ts
│   ├── view-mode-context.tsx
│   ├── plus-options.ts
│   ├── rank-styles.ts
│   └── event-colors.ts
└── types/                         # holiday-jp の型定義など
```

---

## 環境変数（.env.example ベース）

| 変数 | 用途 |
|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase プロジェクト URL（必須） |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名キー（必須） |
| SUPABASE_SERVICE_ROLE_KEY | 招待リンク検証など RLS を超えた操作用（サーバー専用） |
| NEXT_PUBLIC_APP_URL | 本番 OAuth リダイレクト用（任意） |

---

## テスト用 Supabase プロジェクトの整備

テスト用プロジェクトは本番と分け、`.env.test` にテスト用の URL とキーを記載する。整備手順は [supabase/README.md](../supabase/README.md) を参照。`supabase db push` でマイグレーションを一括適用できる（一個ずつ実行する必要はない）。

---

## テスト

- **Vitest**: `npm run test`（watch）/ `npm run test:run`（CI 用一括実行）。環境は jsdom、`vitest.setup.ts` で `@testing-library/jest-dom` を読み込み。
- **単体**: `lib/domain/calendar.test.ts`, `lib/domain/rank.test.ts`, `lib/plus-options.test.ts`。ドメイン・ユーティリティの仕様を保証。
- **データ層**: `lib/data/schedule-entries.test.ts`（Supabase を `vi.mock` で差し替え）。
- **Server Actions**: `app/(dashboard)/dashboard/actions.test.ts`（schedule-entries と `next/cache` をモック、`saveScheduleEntry` の FormData パースと revalidatePath を検証）。
- **コンポーネント**: `components/settings/ViewModeToggle.test.tsx`（ViewModeProvider でラップ、表示モード切替と localStorage を検証）。
- **E2E**: Playwright（`e2e/landing.spec.ts`）。ランディング・ログイン・利用規約など認証不要ページの表示確認。初回は `npx playwright install chromium` でブラウザを入れてから `npm run test:e2e`。
