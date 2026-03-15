# 本番デプロイ前チェックリスト

本サービスを本番環境にデプロイする前に、以下を確認してください。

## 1. 環境変数

- [ ] **NEXT_PUBLIC_SUPABASE_URL** … Supabase プロジェクトの本番 URL
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** … Supabase の anon (public) key（本番プロジェクト）
- [ ] **SUPABASE_SERVICE_ROLE_KEY** … 招待リンク検証などで使用。漏洩に注意し、サーバー側のみで使用すること
- [ ] **NEXT_PUBLIC_APP_URL**（任意）… 本番のアプリ URL。OAuth コールバック等で必要に応じて設定
- [ ] **SENTRY_DSN**（Sentry 導入時）… エラー追跡用。未設定の場合は Sentry は無効化される

## 2. Supabase 本番プロジェクト

- [ ] 本番用プロジェクトを作成し、上記 URL / anon key が本番プロジェクトのものであることを確認
- [ ] RLS (Row Level Security) が必要なテーブルで有効化されていること
- [ ] Auth の「Redirect URLs」に本番のコールバック URL（例: `https://your-app.vercel.app/auth/callback`）を追加
- [ ] メール認証・OAuth プロバイダ（Google / Discord 等）の本番設定が完了していること

## 3. ビルド・テスト

- [ ] `npm run build` が成功すること
- [ ] `npm run test:run` が成功すること
- [ ] 必要に応じて `npm run test:e2e` で主要フローを確認

## 4. 認証フローの手動確認

- [ ] ログイン（メールリンク or OAuth）が本番 URL で動作すること
- [ ] `/auth/callback` へのリダイレクト後、正常にダッシュボードへ遷移すること
- [ ] 招待リンク（`/invite/[calendarId]/[token]`）の redeem が未ログイン・ログイン後ともに期待どおり動作すること

## 5. 規約・プライバシー

- [ ] 利用規約（`/terms`）の最終更新日と内容を確認
- [ ] プライバシーポリシー（`/privacy`）の最終更新日と内容を確認
- [ ] フッター・設定画面からのリンクが正しく設定されていること

## 6. エラー可視化（Sentry 利用時）

- [ ] Sentry プロジェクトを作成し、DSN を環境変数に設定
- [ ] 本番デプロイ後、意図的にエラーを発生させて Sentry に送信されることを確認

## 7. ヘルスチェック（任意）

- [ ] デプロイ先のヘルスチェックで `GET /api/health` を指定している場合、レスポンス 200 と `{ "status": "ok" }` を確認

## 8. 環境変数検証（任意）

- [ ] デプロイ前に `node scripts/validate-env.js` を実行し、必須環境変数が設定されていることを確認（CI に組み込む場合はビルド前に実行）
