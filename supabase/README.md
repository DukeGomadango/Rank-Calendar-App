# Supabase マイグレーションとテスト用プロジェクト整備

## マイグレーションの順序

`supabase/migrations/` のファイルはタイムスタンプ順に適用される。

| ファイル | 内容 |
|----------|------|
| `20260301000000_create_iriam_schema_and_base_tables.sql` | `iriam` スキーマ、calendars, events, schedule_entries, roles, role_permissions, invite_links, invite_redemptions, shares |
| `20260314000000_create_calendar_rank_state.sql` | calendar_rank_state |
| `20260315000000_create_calendar_rank_cycle_history.sql` | calendar_rank_cycle_history |
| `20260316000000_add_events_color_and_type.sql` | events に color, event_type 追加 |
| `20260317000000_add_invite_links_role_id.sql` | invite_links に role_id 追加 |
| `20260318000000_add_skip_pass_remaining.sql` | calendar_rank_state に skip_pass_remaining, skip_pass_last_increment_week_start 追加 |
| `20260319000000_create_skip_pass_snapshots.sql` | skip_pass_snapshots（スキパ枚数の日別スナップショット） |
| `20260320000000_add_stream_content_to_schedule_entries.sql` | schedule_entries に配信内容・左線色（stream_content, stream_content_color）追加 |

**一個一個実行する必要はない。** 下記の手順で `supabase db push` を一度実行すれば、未適用分がまとめて適用される。

---

## テスト用プロジェクトの整備（.env.test の設定を使う）

1. **Supabase ダッシュボードでテスト用プロジェクトを用意する**  
   既に作成済みなら、Project Settings > API から URL と anon key（と必要なら service_role key）を控える。

2. **`.env.test` を用意する**  
   リポジトリの `.env.test` に、テスト用プロジェクトの値を書く。

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 招待リンク検証などで使う場合
   ```

3. **Supabase CLI でプロジェクトをリンクする**  
   URL の `https://jhnyatboqrkgbisuxdbm.supabase.co` のように `https://<project-ref>.supabase.co` の `<project-ref>` がプロジェクト ref。

   ```bash
   supabase link --project-ref <project-ref>
   ```

   プロンプトでデータベースのパスワードを聞かれたら、ダッシュボードの Database > Database password で設定したものを入力する。

4. **マイグレーションを一括適用する**

   ```bash
   supabase db push
   ```

   これで上記マイグレーションがすべて適用され、テスト用プロジェクトの DB がアプリで必要なスキーマになる。

5. **アプリをテスト用で動かすとき**  
   環境変数に `.env.test` を読ませる。例（PowerShell）:

   ```powershell
   Get-Content .env.test | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }; npm run dev
   ```

   あるいは `.env.test` を `.env.local` にコピーして `npm run dev` する（本番用に戻すときは忘れずに戻す）。

---

## 本番プロジェクトを一から作る場合

本番用に新規プロジェクトを作り直す場合も同じ。

1. ダッシュボードで本番用プロジェクトを新規作成
2. `supabase link --project-ref <本番の ref>`
3. `supabase db push`
4. 本番の URL / anon key / service_role key を本番用の環境変数（Vercel 等）に設定
