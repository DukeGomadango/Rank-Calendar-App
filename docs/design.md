# 設計思想・アーキテクチャ（Design）

## 設計思想

- **シンプルさ**: ランク管理に必要な機能に絞り、余計な依存を増やさない。
- **プライバシー**: OCR はクライアントのみで実行し、画像をサーバーに送らない。トラッキングを行わない。
- **権限の明確化**: カレンダー単位でオーナーと共有先を分け、ロールで「何を見せるか」を細かく制御する。
- **日付は JST 一貫**: アプリ内の日付ロジックはすべて JST（Asia/Tokyo）基準。週は月曜始まり（ISO 週）で統一。

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
- **Server Actions**: フォーム送信・スケジュール保存・イベント操作・共有・設定などは `"use server"` の Server Actions で実装（例: `dashboard/actions.ts`, `events/actions.ts`, `sharing/actions.ts`）。

### 認証・API

- **REST API**: 明示的な REST エンドポイントは `src/app/auth/callback/route.ts`（OAuth の code → session 交換）のみ。
- **その他**: Supabase クライアントの直叩き + Server Actions。RLS（Row Level Security）は Supabase 側で設定する想定。
- **招待リンク検証**: サーバー側で `SUPABASE_SERVICE_ROLE_KEY` を使い、RLS を超えた操作が必要な場合はサービスロールで実行。

### クライアント側の状態

- **MockScheduleProvider**: 開発時・未ログイン時のスケジュールモック。日付別のモックデータを提供。
- **ViewModeProvider**: 表示モード（`simple` / `detailed`）を `localStorage`（キー: `iriam_view_mode`）で永続化。
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
- **`lib/domain/rank.ts`**: `RankEntry`, `WeeklyRankProgress`, `RankJudgement`。`calculateWeeklyRankProgress`（週ごとの + 集計）、`judgeWeeklyRank`（+18 ランクアップ可、+12 中間目標の判定）。週は月曜始まり、スキップ日は集計から除外。

---

## フォルダ構成（主要部分）

```
src/
├── app/
│   ├── layout.tsx                 # ルートレイアウト（フォント、metadata、JsonLd）
│   ├── page.tsx                   # ランディング
│   ├── login/, signup/
│   ├── privacy/, terms/
│   ├── auth/callback/route.ts     # OAuth コールバック
│   ├── (dashboard)/
│   │   ├── layout.tsx             # ダッシュボードレイアウト（MockScheduleProvider, ViewModeProvider, サイドバー/モバイルナビ）
│   │   └── dashboard/
│   │       ├── page.tsx           # ホーム
│   │       ├── actions.ts         # スケジュール保存・移動など
│   │       ├── calendar/, data/, events/, sharing/, settings/
│   │       └── settings/events/, settings/sharing/
│   └── invite/[calendarId]/[token]/  # 招待リンク
├── components/
│   ├── landing/                   # Hero, Features, HowItWorks, CtaSection, Faq, Footer, Trust, JsonLd, LandingHeader
│   ├── schedule/                  # CalendarMockWrapper, CalendarWithModal, HomeScheduleCard, ScheduleForm
│   ├── data/                      # DataTable, DataTableWithMockState, DataRangeSelect
│   ├── ocr/                       # BorderOcrButton
│   ├── onboarding/                # OnboardingCard
│   └── settings/                  # ViewModeToggle
├── lib/
│   ├── supabase/                  # server.ts（createSupabaseServerClient）, client.ts
│   ├── auth/                      # permission.ts（getCalendarPermissionsForUser）
│   ├── data/                      # calendars, schedule-entries, events, roles, permissions, shares, invite-links, invite-redemptions
│   ├── domain/                    # calendar.ts, rank.ts（＋テスト）
│   ├── mock-schedule-context.tsx
│   └── view-mode-context.tsx
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

## テスト

- **Vitest**: `npm run test` で実行。
- ドメインロジックを中心にテスト（`lib/domain/calendar.test.ts`, `lib/domain/rank.test.ts`）。日付・週・ランク判定の仕様がコードと一致していることを保証する。
