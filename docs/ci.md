# CI / 品質ゲート

## 概要

- **lint-and-test**: 毎回実行（GitHub Actions）。`npx eslint .` → `npx tsc --noEmit` → `npm run test:run` → `npm run test:coverage` の順で実行。
- **e2e**: リポジトリ Variables の `E2E_ENABLED` が `true` のときのみ実行（Secrets だけでは job を条件分岐できない）。`npx playwright install --with-deps` の後に `npm run test:e2e` を実行。

## 必要な Secrets（E2E を有効にする場合）

| Secret | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL（アプリが接続するため） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `E2E_TEST_SECRET` | E2E 用ログイン API の検証用秘密文字列（任意の文字列でよい） |
| `E2E_TEST_USER_EMAIL` | E2E 専用テストユーザーのメールアドレス |
| `E2E_TEST_USER_PASSWORD` | 上記ユーザーのパスワード |

E2E 用ユーザーは Supabase の認証で作成し、オンボーディング完了済みにしておくと `e2e/schedule.spec.ts` の「今日の目標+を入力して保存」が `test.skip` されずに実行されます（未完了の場合は skip されます）。

## カバーッジ

- `npm run test:coverage` で `vitest run --coverage` を実行。
- 閾値は `vitest.config.mts` の `coverage.thresholds` で指定（`lines: 60`, `functions: 60`, `branches: 45`, `statements: 60`）。
- レポートは `coverage/` に出力（HTML は `coverage/index.html`）。
