# 技術的負債台帳

このドキュメントは、技術的負債を「見える化 → 優先度付け → 返済 → 検証」するための台帳です。

## 進め方（ルール）
- **優先度**: P0（本番事故/侵害/データ破壊） > P1（回帰防止/調査性） > P2（開発速度/保守性） > P3（改善余地）
- **完了の定義**: 変更が「テスト/CI/運用手順」で検証でき、再発防止策が台帳に残っていること
- **見積り**: S（〜半日）/ M（1〜3日）/ L（1週間〜）

## テンプレ
### [P?][S|M|L] タイトル
- **場所**: `path/to/file` / `dir/`
- **事象**: 何が問題か（観測された事実）
- **影響**: ユーザー/運用/開発への影響
- **再現条件**: いつ起きるか（条件・環境）
- **推奨対応**: どう直すか（具体）
- **検証方法**: 何をもって直ったとするか（コマンド/観点）
- **ステータス**: 未着手 / 進行中 / 完了

---

## 台帳（初期投入）

### [P0][S] E2E 生成物が作業ツリーを汚す（誤コミット/差分ノイズ）
- **場所**: `.gitignore` / `playwright-report/` / `test-results/`
- **事象**: Playwright 実行で生成される `playwright-report/` と `test-results/` が git 管理対象に見えていた
- **影響**: 誤コミット、差分汚染、レビュー/CIノイズ、リポジトリ肥大
- **再現条件**: `npm run test:e2e` 実行後
- **推奨対応**: `.gitignore` に `playwright-report/` と `test-results/` を追加。CI ではレポートをアーティファクト化して追跡
- **検証方法**: E2E 実行後に `git status` で生成物が出ないこと
- **ステータス**: 完了

### [P0][S] 本番で E2E 専用ログイン API が露出し得る（attack surface）
- **場所**: `src/app/api/e2e-login/route.ts`
- **事象**: `x-e2e-secret` によるガードはあるが、ルート自体は本番にも含まれ得る
- **影響**: 秘密情報の漏洩/誤設定時に悪用されるリスク、攻撃面の増加
- **再現条件**: 本番環境でルートがデプロイされ、環境変数/ヘッダーが誤運用された場合
- **推奨対応**: 本番（`NODE_ENV=production`）では常に 404 として無効化
- **検証方法**: 本番相当のビルド/起動で `/api/e2e-login` が 404 を返すこと
- **ステータス**: 完了

### [P1][S] E2E セットアップで例外を握りつぶし、失敗原因が消える
- **場所**: `e2e/global-setup.ts`
- **事象**: URL 遷移待ちの失敗を `catch(() => {})` で握りつぶしていた
- **影響**: 認証遷移失敗等の原因追跡が困難、フレーク増、障害のサイレント劣化
- **再現条件**: `/api/e2e-login` の遷移/リダイレクトが期待通りでない時
- **推奨対応**: 想定内の失敗として warn を残し、少なくともログで原因が追える形にする
- **検証方法**: 失敗時に警告ログが出ること、成功時に `e2e/.auth/user.json` が生成されること
- **ステータス**: 完了

### [P1][M] `docs/README.md` の目次が不完全で運用ドキュメントに辿れない
- **場所**: `docs/README.md`
- **事象**: `ci.md` / `production-checklist.md` / `security-audit.md` / `supabase-email-templates.md` への導線がなかった
- **影響**: 運用・リリース・セキュリティの確認漏れ、属人化
- **再現条件**: 新規参加者/運用担当が docs を読む時
- **推奨対応**: `docs/README.md` を運用ハブ化し、一覧に追加。負債台帳への導線も付ける
- **検証方法**: docs の入口から必要ドキュメントへ 1〜2 クリックで到達できること
- **ステータス**: 完了

### [P1][M] 型チェックが `.next` の生成物に依存し得る（ローカル/CI差分の温床）
- **場所**: `tsconfig.json`
- **事象**: `include` に `.next/types/**/*.ts` / `.next/dev/types/**/*.ts` が含まれている
- **影響**: `.next` 生成状態により型チェック結果が変わる可能性、初見環境でのつまずき
- **再現条件**: `next build` を実行していない/実行済みなどで `.next` の状態が異なる時
- **推奨対応**: `.next` 依存を外す（または生成手順として固定化し、通常の型チェックから分離）
- **検証方法**: クリーンな状態でも `npm run build` / 型チェックが安定すること
- **ステータス**: 完了

### [P2][M] Vitest のカバレッジ閾値が低く、品質ゲートになりにくい
- **場所**: `vitest.config.mts`
- **事象**: lines/functions/statements=11、branches=9
- **影響**: 回帰が混入しやすい。テストの増加が促進されにくい
- **再現条件**: 新規コードがテストなしで追加される時
- **推奨対応**: 重要モジュール（例: `src/lib/**`）からテストを増やし、閾値を段階的に引き上げる
- **検証方法**: PRごとに閾値/カバレッジが下がらない運用ができていること
- **ステータス**: 完了

### [P2][M] Supabase 認証ライブラリが併存し移行/保守コストが増える
- **場所**: `package.json`（`@supabase/auth-helpers-nextjs` と `@supabase/ssr` の併存）
- **事象**: Supabase 側で移行推奨の流れがある中で、パッケージが二重管理になっている
- **影響**: バグ修正・アップデート時のコスト増、将来の破壊的変更への追随が難しくなる
- **再現条件**: 認証まわりの改修/依存更新時
- **推奨対応**: `@supabase/ssr` へ一本化し、利用箇所を移行
- **検証方法**: 旧helpersへの参照がなくなり、ログイン/保護ルートが問題なく動作すること
- **ステータス**: 完了

### [P3][M] OCR の重い依存（tesseract.js）が配信/実行負荷になり得る
- **場所**: `src/components/ocr/EventCalendarOcrImporter.tsx` / `tesseract.js`
- **事象**: OCR が本体依存に入り、使わないユーザーにもコストが乗りやすい
- **影響**: 初期ロードサイズ増、実行時負荷、体験悪化
- **再現条件**: OCR を使わない利用でもバンドルに含まれる場合
- **推奨対応**: 動的 import、Worker 分離、必要ページのみロードなどで局所化
- **検証方法**: バンドル解析/計測で OCR 非使用時のコストが下がること
- **ステータス**: 完了

### [P1][M] Error 境界で `console.error(error)` が本番でも実行され得る（内部詳細が露出）
- **場所**: `src/app/error.tsx` / `src/app/(dashboard)/error.tsx`
- **事象**: `useEffect` 内で `console.error(error)` を実行し、あわせて `Sentry.captureException` も行っている
- **影響**: 例外オブジェクトに DB/制約/クエリ等の内部詳細が含まれる場合、ブラウザ側で参照され得る
- **再現条件**: 本番相当で Error Boundary（クライアント側表示）に到達し、かつ例外メッセージ/プロパティに詳細が含まれる時
- **推奨対応**: `process.env.NODE_ENV === "development"` のときのみ `console.error`（もしくは詳細を汎用化）し、本番は Sentry のみへ寄せる
- **検証方法**: `process.env.NODE_ENV=production` 相当の build/動作で Error Boundary を踏ませ、ブラウザ `console` に内部詳細（例外オブジェクトそのもの）が出ないことを確認（詳細は Sentry のみ）
- **ステータス**: 完了

### [P1][S] Server Action で `throwDataLayerError` を経由せず `error.message` を含む例外を投げ得る
- **場所**: `src/app/(dashboard)/dashboard/actions.ts`（`moveScheduleEntry` 内の `schedule_entries` delete 失敗）
- **事象**: データ層の `throwDataLayerError` ではなく、`throw new Error(\`... failed: ${error.message} ...\`)` の形で内部詳細を例外メッセージに含めている
- **影響**: 上記 Error 境界の console 出力等と組み合わさると、内部詳細の露出/ログ過多になり得る
- **再現条件**: `moveScheduleEntry` 実行時に `schedule_entries` の delete が失敗する時（RLS/整合性/DBエラー等）
- **推奨対応**: 例外を `throwDataLayerError` に寄せる、もしくは本番時はメッセージを汎用化して throw する
- **検証方法**: 変更箇所（`moveScheduleEntry` の delete エラー）を `throwDataLayerError` 経由に寄せたことを確認し、`npm run test:run` / `npm run test:coverage` が通ることをもってコンパイル・回帰を担保（本番では汎用メッセージに置換される）
- **ステータス**: 完了

### [P2][M] Vitest のカバレッジ閾値が低く、品質ゲートとして弱い
- **場所**: `vitest.config.mts`（`coverage.thresholds`）
- **事象**: `lines/functions/statements=11`、`branches=9` と低い閾値のため、十分なテストが増えていない状況でもゲートを通過しやすい
- **影響**: 回帰が混入しても検知されにくく、テスト追加が後回しになりやすい
- **再現条件**: 新規コード追加（または改修）に対してユニットテストが増えない/薄い時
- **推奨対応**: `src/lib/**` など重要モジュールから段階的に閾値を引き上げる（テストが追いつくまで P2→P3 的に段階導入）
- **検証方法**: `vitest.config.mts` を重要ロジック中心の対象に絞った上で閾値を引き上げ、`npm run test:coverage` が通過することを確認（品質ゲートとして機能することを担保）
- **ステータス**: 完了

### [P3][S] `layout.tsx` のメタデータベース URL がハードコードで環境差が起きやすい
- **場所**: `src/app/layout.tsx`（`SITE_URL` / `metadataBase` / OGP URL）
- **事象**: `NEXT_PUBLIC_APP_URL` を優先する設計になっていないため、デプロイ先が変わるとメタデータ/OGP の URL が期待とズレる可能性がある
- **影響**: SEO/OGP 表示、ドメイン切替時の正しさが担保しにくい
- **再現条件**: Vercel preview や別環境で `SITE_URL` が不一致になる時
- **推奨対応**: `process.env.NEXT_PUBLIC_APP_URL` を優先し、フォールバックを用意する
- **検証方法**: `NEXT_PUBLIC_APP_URL` を切り替えた状態で `metadataBase` / `openGraph.url` / OGP 画像URL が期待値になることを確認
- **ステータス**: 完了

