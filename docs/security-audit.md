# セキュリティ監査レポート（敵対的視点）

実施日: 2026-03-16  
対象: Rank Calendar App（Next.js + Supabase）

---

## 1. 仮説と調査結果

### 仮説A: カレンダーIDをクライアントから受け取り、所有権チェックなしでDBを更新している（IDOR）

**結果: CONFIRMED**

- **対象**: `src/app/(dashboard)/dashboard/actions.ts` の `saveScheduleEntry`, `moveScheduleEntry`, `updateScheduleEntryField`, `updateSkipPassRemaining`, `updateSkipPassSnapshot`, `applyRankUp`, `updateCurrentRank`, `updateRankResetDate`。および `dashboard/events/actions.ts` の `createEvent`, `deleteEventAction`。
- **内容**: いずれも `calendar_id` を FormData または引数で受け取り、`getCalendarPermissionsForUser` や `getOrCreateDefaultCalendarForUser` による**編集権限の確認を行っていない**。攻撃者が他ユーザーの `calendar_id`（UUID）を推測または漏洩経路で知った場合、そのカレンダーへの書き込み・削除が可能になる可能性がある。
- **前提**: `iriam` スキーマに RLS が未設定のため、Supabase の認証済みロールが全行にアクセスできる環境では IDOR が成立する。RLS を後から付与する場合でも、アプリ層での権限チェックは多層防御として推奨される。

---

### 仮説B: 認証コールバックの `redirect_to` がオープンリダイレクトになりうる

**結果: CONFIRMED**

- **対象**: `src/app/auth/callback/route.ts`
- **内容**: `redirect_to` をそのまま `new URL(redirectTo, requestUrl.origin)` に渡している。`redirect_to=//evil.com` のように指定すると、同一オリジン基準で解釈され結果的に `https://evil.com` など外部へリダイレクトされる可能性がある（ブラウザ依存）。相対パス以外を許可すべきではない。
- **推奨**: `redirect_to` を「先頭が `/` のみで `//` で始まらない」ように検証し、違反時は `/dashboard` へフォールバックする。

---

### 仮説C: Service Role の使用範囲が広く、招待リンク検証以外でも使われている

**結果: INCONCLUSIVE（設計上許容）**

- **対象**: `invite-links.ts`（トークン検証）, `shares.ts`（`upsertShareWithServiceRole`）
- **内容**: 招待 redeem 時にのみ Service Role で `shares` を挿入している。招待リンクはトークン検証済みのため、流用は限定的。Service Role はサーバー内にのみ保持され、クライアントに露出していない。
- **推奨**: 現状維持。Service Role を扱う関数は最小限にし、呼び出し元を招待 redeem フローのみに限定し続けること。

---

### 仮説D: デバッグ用の console やエラーメッセージで内部情報が漏れる

**結果: PARTIAL**

- **対象**: `invite/[calendarId]/[token]/page.tsx` の `console.error` は `NODE_ENV === "development"` 時のみ実行 → 許容。
- **懸念**: データ層の `throw new Error("... failed: ${error.message}")` は、Supabase のエラーメッセージをそのまま含む。これが Error Boundary 経由でユーザーに表示されうる場合、テーブル名・制約名などが漏れる可能性がある。
- **推奨**: 本番では汎用メッセージに差し替え、詳細はサーバーログまたは Sentry のみに記録する。

---

### 仮説E: iriam スキーマに RLS がなく、認証済みユーザーが全データにアクセスできる

**結果: CONFIRMED（マイグレーション上）**

- **対象**: `supabase/migrations/20260301000000_create_iriam_schema_and_base_tables.sql` および以降の iriam 用マイグレーション。
- **内容**: `public.profiles` と `storage.objects` には RLS が設定されているが、`iriam.calendars`, `iriam.schedule_entries`, `iriam.events` 等には **ENABLE ROW LEVEL SECURITY および POLICY が存在しない**。PostgreSQL のデフォルト権限と Supabase のロール付与次第では、認証済みユーザーが他ユーザーのデータを読み書きできる可能性がある。
- **推奨**: iriam スキーマの全テーブルに RLS を有効化し、「オーナーまたは shares で権限を持つユーザーのみ」に限定するポリシーを追加する（多層防御）。同時にアプリ層での権限チェック（仮説A の対応）を実装すること。

---

## 2. 責務の分離で不足している部分

| レイヤー | 現状 | 問題 |
|----------|------|------|
| ルート/ページ | 認証チェック（getUser + redirect）はある | 問題なし |
| Server Actions（スケジュール・イベント） | 認証なし。`calendar_id` のみでデータ層を呼ぶ | **認可（編集可能か）のチェックがない** |
| データ層（schedule-entries, events, calendars） | 呼び出し元を信頼し、calendar_id をそのまま使用 | 権限チェックは呼び出し元の責務だが、現状呼び出し元が未実装 |
| 共有・設定系 Actions | `getOrCreateDefaultCalendarForUser(user.id)` で自カレンダーに限定 | 適切に分離されている |
| 認証コールバック | redirect 先をクエリで受け取る | **検証なしで URL を組み立て** |

**結論**: 「編集系 Server Actions」が「このユーザーはこの calendar_id に対して編集可能か」を確認していないため、責務の分離というより**認可の欠落**が問題。

---

## 3. 実施した修正（要約）

1. **IDOR 防止**: カレンダー編集系の全 Server Action の先頭で「現在ユーザーが当該カレンダーを編集可能か」をチェックする `ensureUserCanEditCalendar(calendarId)` を呼ぶようにした。
2. **オープンリダイレクト防止**: auth callback で `redirect_to` を「`/` で始まり `//` で始まらない」相対パスに限定し、違反時は `/dashboard` にリダイレクトするようにした。
3. **RLS の追加**: iriam スキーマの全テーブルに Row Level Security を有効化し、オーナー・共有先のみアクセス可能なポリシーを追加した（マイグレーション `20260325000000_add_iriam_rls.sql`）。
4. **エラーメッセージの一般化**: データ層および認可層で本番時に内部詳細を返さず、汎用メッセージを表示し、詳細は Sentry に送るようにした（`throwDataLayerError`）。

---

## 4. 推奨事項の実施状況

- **RLS の追加**: ✅ 実施済み。`supabase/migrations/20260325000000_add_iriam_rls.sql` で iriam スキーマの全テーブルに RLS を有効化し、オーナーまたは shares に基づくポリシーを定義した。`authenticated` ロールにのみ GRANT し、未認証では iriam にアクセスできない。
- **エラーメッセージの一般化**: ✅ 実施済み。`src/lib/errors.ts` に `throwDataLayerError` を追加。本番では「しばらくして再度お試しください。」を throw し、詳細は Sentry に送信。データ層（calendars, schedule-entries, events, shares, roles, invite-links, invite-redemptions, calendar-rank-state, profiles）および `lib/auth/permission.ts` で利用。
- **ヘルスチェック**: `/api/health` は現状で機密情報を返していないため問題なし。必要なら Basic 認証や IP 制限を検討。
- **middleware**: ✅ 実装済み。`middleware.ts` で `@supabase/ssr` の `createServerClient` により Edge 上でセッションを検証し、未ログインで `/dashboard/*` にアクセスした場合は `/login` へリダイレクトする。開発時は `MOCK_ROLE_COOKIE` が設定されていればセッションなしでもダッシュボードを許可。各ページの `getUser` + `redirect` は多層防御として残している。
