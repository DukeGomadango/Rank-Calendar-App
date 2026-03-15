---
name: japanese-git-commit
description: Commit with Japanese messages in UTF-8 without mojibake on Windows/PowerShell. This project uses Japanese commit messages by default. Use when committing, pushing, or writing git commit messages; use the -F file method for any Japanese message.
---

# 日本語 Git コミット（UTF-8）

**このプロジェクトではコミットメッセージは基本日本語で書く。** ユーザーが特に指定しなければ日本語でコミットする。

PowerShell などでは `git commit -m "日本語"` をそのまま使うとシェルのエンコーディングで文字化けすることがある。**メッセージを UTF-8 のファイルから読ませる**方法で確実に UTF-8 でコミットする。

## 手順（推奨: -F でファイル指定）

1. **メッセージを UTF-8 でファイルに書き出す**
   - 作業ツリーに一時ファイル（例: `.git-commit-msg-utf8.txt`）を作成する。
   - 中身はコミットメッセージのみ（1行目がタイトル、空行で区切って本文可）。
   - ファイルは必ず **UTF-8** で保存する（エディタの「UTF-8で保存」）。

2. **そのファイルを指定してコミット**
   ```bash
   git commit -F .git-commit-msg-utf8.txt
   ```
   既存のコミットを直す場合:
   ```bash
   git commit --amend -F .git-commit-msg-utf8.txt
   ```

3. **一時ファイルを削除**
   - コミット後、`.git-commit-msg-utf8.txt` などは削除してよい（コミットしない）。

4. **プッシュ**
   - `--amend` した場合は履歴が変わるので `git push --force-with-lease` を使う。

## Git 設定（任意）

リポジトリまたはグローバルで UTF-8 を明示しておくと、ログ表示なども崩れにくい。

```bash
git config --local i18n.commitEncoding utf-8
git config --local i18n.logOutputEncoding utf-8
git config --local core.quotepath false
```

`--local` はこのリポジトリのみ。全プロジェクトで使う場合は `--global` に変更。

## エージェントがコミットするとき

- **基本方針**: このリポジトリのコミットは日本語メッセージとする。ユーザーが「英語で」などと指定しない限り、日本語で書く。
- 日本語メッセージでは必ず上記の **-F ファイル** 方式を使う（`-m` は文字化けの原因になるため使わない）。
- 手順: メッセージ用の UTF-8 一時ファイルを書き → `git add` 済みなら `git commit -F <そのファイル>`（必要なら `--amend`）→ 一時ファイルを削除 → `git push`（amend した場合は `--force-with-lease`）。

## 注意

- `git commit -m "日本語"` をシェルで直接実行すると、環境によっては文字化けする。日本語メッセージでは **-F** を使う。
- 一時ファイル名は `.git-commit-msg-utf8.txt` や `msg.txt` など、プロジェクトで共有しない名前がよい。
