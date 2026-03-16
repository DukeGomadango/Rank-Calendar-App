# CI / 品質ゲート

## 概要

- **lint-and-test**: 毎回実行。Lint・型チェック・ユニットテスト・カバーッジ閾値チェック。
- **e2e**: `E2E_TEST_SECRET` がリポジトリの Secrets に設定されているときのみ実行。

## 必要な Secrets（E2E を有効にする場合）

| Secret | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL（アプリが接続するため） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `E2E_TEST_SECRET` | E2E 用ログイン API の検証用秘密文字列（任意の文字列でよい） |
| `E2E_TEST_USER_EMAIL` | E2E 専用テストユーザーのメールアドレス |
| `E2E_TEST_USER_PASSWORD` | 上記ユーザーのパスワード |

E2E 用ユーザーは Supabase の認証で作成し、オンボーディング完了済みにしておくと「今日の目標+を入力して保存」のシナリオがそのまま通る。

## カバーッジ

- `npm run test:coverage` で `vitest run --coverage` を実行。
- 閾値は `vitest.config.mts` の `coverage.thresholds` で指定。テスト追加に応じて段階的に引き上げ可能。
- レポートは `coverage/` に出力（HTML は `coverage/index.html`）。
