## Supabase 認証メールテンプレート（コピー用）

Supabase ダッシュボードの **Auth → Templates** にそのまま貼り付けて使うためのテンプレート集です。

対象:
- Magic Link / Email login（パスワードレスログイン）
- Confirm signup（メールリンクでの新規登録完了）

有効期限は Supabase Auth 側の設定で固定値（例: 1時間）にしておき、メール本文では変数ではなくベタ書きで表現します。

---

## 1. Magic Link（Email login）用

### 件名（Subject）

```text
【IRIAM だんごスケジュール】ログイン用リンクのご案内
```

### テキスト版（Plain text Body）

```text
{{ .Email }} 様

IRIAM だんごスケジュールをご利用いただきありがとうございます。

以下のリンクをクリックして、ログインを完了してください。

{{ .ConfirmationURL }}

※このリンクは発行から1時間のみ有効です。
  有効期限が切れている場合は、ログイン画面から再度メールリンクをお受け取りください。

もし上記のリンクをクリックできない場合は、このURLをブラウザのアドレスバーにコピー＆ペーストしてください。

---
当サービスは IRIAM 公式ではなく、ライバー向けの非公式スケジュール管理ツールです。
本メールにお心当たりがない場合は、このメールを破棄してください。
```

### HTML版（HTML Body）

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>ログイン用リンクのご案内</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <tr>
              <td align="left" style="padding-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:#0ea5e9;">IRIAM だんごスケジュール</div>
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">ログイン用リンクのご案内</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#374151;padding-bottom:24px;">
                <p style="margin:0 0 12px 0;">{{ .Email }} 様</p>
                <p style="margin:0 0 12px 0;">IRIAM だんごスケジュールをご利用いただきありがとうございます。</p>
                <p style="margin:0 0 12px 0;">以下のボタンをクリックして、ログインを完了してください。</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 32px;border-radius:999px;background-image:linear-gradient(90deg,#0ea5e9,#38bdf8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  ログインする
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.7;color:#6b7280;padding-bottom:16px;">
                <p style="margin:0 0 8px 0;">※このリンクは発行から1時間のみ有効です。</p>
                <p style="margin:0 0 8px 0;">もしボタンをクリックできない場合は、以下のURLをブラウザのアドレスバーにコピー＆ペーストしてください。</p>
                <p style="margin:0;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0ea5e9;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:0 0 4px 0;">当サービスはIRIAM公式ではなく、ライバー向けの非公式スケジュール管理ツールです。</p>
                <p style="margin:0;">本メールにお心当たりがない場合は、このメールを破棄してください。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. Confirm signup（新規登録確認）用

### 件名（Subject）

```text
【IRIAM だんごスケジュール】アカウント登録用リンクのご案内
```

### テキスト版（Plain text Body）

```text
{{ .Email }} 様

IRIAM だんごスケジュールへのご登録ありがとうございます。

以下のリンクをクリックして、アカウント登録を完了してください。

{{ .ConfirmationURL }}

※このリンクは発行から1時間のみ有効です。
  有効期限が切れている場合は、新規登録画面から再度メールリンクをお受け取りください。

もし上記のリンクをクリックできない場合は、このURLをブラウザのアドレスバーにコピー＆ペーストしてください。

---
当サービスは IRIAM 公式ではなく、ライバー向けの非公式スケジュール管理ツールです。
本メールにお心当たりがない場合は、このメールを破棄してください。
```

### HTML版（HTML Body）

Confirm signup は Magic Link 用HTMLを流用し、見出しとボタン文言だけ変更します。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>アカウント登録用リンクのご案内</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <tr>
              <td align="left" style="padding-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:#0ea5e9;">IRIAM だんごスケジュール</div>
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">アカウント登録用リンクのご案内</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#374151;padding-bottom:24px;">
                <p style="margin:0 0 12px 0;">{{ .Email }} 様</p>
                <p style="margin:0 0 12px 0;">IRIAM だんごスケジュールへのご登録ありがとうございます。</p>
                <p style="margin:0 0 12px 0;">以下のボタンをクリックして、アカウント登録を完了してください。</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 32px;border-radius:999px;background-image:linear-gradient(90deg,#0ea5e9,#38bdf8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  登録を完了する
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.7;color:#6b7280;padding-bottom:16px;">
                <p style="margin:0 0 8px 0;">※このリンクは発行から1時間のみ有効です。</p>
                <p style="margin:0 0 8px 0;">もしボタンをクリックできない場合は、以下のURLをブラウザのアドレスバーにコピー＆ペーストしてください。</p>
                <p style="margin:0;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0ea5e9;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:0 0 4px 0;">当サービスはIRIAM公式ではなく、ライバー向けの非公式スケジュール管理ツールです。</p>
                <p style="margin:0;">本メールにお心当たりがない場合は、このメールを破棄してください。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. Invite user（ユーザー招待）用

### 件名（Subject）

```text
【IRIAM だんごスケジュール】招待リンクのご案内
```

### テキスト版（Plain text Body）

```text
{{ .Email }} 様

IRIAM だんごスケジュールへの招待が届いています。

以下のリンクをクリックして、アカウントを作成またはログインし、招待を受け取ってください。

{{ .ConfirmationURL }}

※このリンクは発行から1時間のみ有効です。
  有効期限が切れている場合は、招待を送ってくれた方に再度リンクの発行を依頼してください。

もし上記のリンクをクリックできない場合は、このURLをブラウザのアドレスバーにコピー＆ペーストしてください。

---
当サービスは IRIAM 公式ではなく、ライバー向けの非公式スケジュール管理ツールです。
本メールにお心当たりがない場合は、このメールを破棄してください。
```

### HTML版（HTML Body）

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>招待リンクのご案内</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <tr>
              <td align="left" style="padding-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:#0ea5e9;">IRIAM だんごスケジュール</div>
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">招待リンクのご案内</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#374151;padding-bottom:24px;">
                <p style="margin:0 0 12px 0;">{{ .Email }} 様</p>
                <p style="margin:0 0 12px 0;">IRIAM だんごスケジュールへの招待が届いています。</p>
                <p style="margin:0 0 12px 0;">以下のボタンをクリックして、アカウントを作成またはログインし、招待を受け取ってください。</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 32px;border-radius:999px;background-image:linear-gradient(90deg,#0ea5e9,#38bdf8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  招待を開く
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.7;color:#6b7280;padding-bottom:16px;">
                <p style="margin:0 0 8px 0;">※このリンクは発行から1時間のみ有効です。</p>
                <p style="margin:0 0 8px 0;">もしボタンをクリックできない場合は、以下のURLをブラウザのアドレスバーにコピー＆ペーストしてください。</p>
                <p style="margin:0;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0ea5e9;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:0 0 4px 0;">当サービスはIRIAM公式ではなく、ライバー向けの非公式スケジュール管理ツールです。</p>
                <p style="margin:0;">本メールにお心当たりがない場合は、このメールを破棄してください。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 4. Change email address（メールアドレス変更確認）用

### 件名（Subject）

```text
【IRIAM だんごスケジュール】メールアドレス変更の確認
```

### テキスト版（Plain text Body）

```text
{{ .Email }} 様

IRIAM だんごスケジュールのアカウントで、メールアドレスの変更がリクエストされました。

新しいメールアドレス:
{{ .NewEmail }}

以下のリンクをクリックして、メールアドレスの変更を確定してください。

{{ .ConfirmationURL }}

※このリンクは発行から1時間のみ有効です。
  心当たりがない場合は、このメールを無視してください。アカウントの設定は変更されません。

もし上記のリンクをクリックできない場合は、このURLをブラウザのアドレスバーにコピー＆ペーストしてください。

---
当サービスは IRIAM 公式ではなく、ライバー向けの非公式スケジュール管理ツールです。
本メールにお心当たりがない場合は、このメールを破棄してください。
```

### HTML版（HTML Body）

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>メールアドレス変更の確認</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <tr>
              <td align="left" style="padding-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:#0ea5e9;">IRIAM だんごスケジュール</div>
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">メールアドレス変更の確認</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#374151;padding-bottom:24px;">
                <p style="margin:0 0 12px 0;">{{ .Email }} 様</p>
                <p style="margin:0 0 12px 0;">IRIAM だんごスケジュールのアカウントで、メールアドレスの変更がリクエストされました。</p>
                <p style="margin:0 0 12px 0;">新しいメールアドレス: <strong>{{ .NewEmail }}</strong></p>
                <p style="margin:0 0 12px 0;">以下のボタンをクリックして、メールアドレスの変更を確定してください。</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 32px;border-radius:999px;background-image:linear-gradient(90deg,#0ea5e9,#38bdf8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  変更を確定する
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.7;color:#6b7280;padding-bottom:16px;">
                <p style="margin:0 0 8px 0;">※このリンクは発行から1時間のみ有効です。</p>
                <p style="margin:0 0 8px 0;">心当たりがない場合は、このメールを無視してください。アカウントの設定は変更されません。</p>
                <p style="margin:0 0 8px 0;">もしボタンをクリックできない場合は、以下のURLをブラウザのアドレスバーにコピー＆ペーストしてください。</p>
                <p style="margin:0;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0ea5e9;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:0 0 4px 0;">当サービスはIRIAM公式ではなく、ライバー向けの非公式スケジュール管理ツールです。</p>
                <p style="margin:0;">本メールにお心当たりがない場合は、このメールを破棄してください。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 5. Reset password（パスワードリセット）用

> 現時点でパスワードを使わない設計でも、将来 Email+Password を有効にする可能性を考えて日本語化しておく。

### 件名（Subject）

```text
【IRIAM だんごスケジュール】パスワード再設定のご案内
```

### テキスト版（Plain text Body）

```text
{{ .Email }} 様

IRIAM だんごスケジュールのアカウントで、パスワード再設定のリクエストが行われました。

以下のリンクをクリックして、新しいパスワードを設定してください。

{{ .ConfirmationURL }}

※このリンクは発行から1時間のみ有効です。

心当たりがない場合は、このメールを無視してください。アカウントのパスワードは変更されません。

もし上記のリンクをクリックできない場合は、このURLをブラウザのアドレスバーにコピー＆ペーストしてください。

---
当サービスは IRIAM 公式ではなく、ライバー向けの非公式スケジュール管理ツールです。
本メールにお心当たりがない場合は、このメールを破棄してください。
```

### HTML版（HTML Body）

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>パスワード再設定のご案内</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <tr>
              <td align="left" style="padding-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:#0ea5e9;">IRIAM だんごスケジュール</div>
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">パスワード再設定のご案内</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#374151;padding-bottom:24px;">
                <p style="margin:0 0 12px 0;">{{ .Email }} 様</p>
                <p style="margin:0 0 12px 0;">IRIAM だんごスケジュールのアカウントで、パスワード再設定のリクエストが行われました。</p>
                <p style="margin:0 0 12px 0;">以下のボタンをクリックして、新しいパスワードを設定してください。</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 32px;border-radius:999px;background-image:linear-gradient(90deg,#0ea5e9,#38bdf8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  パスワードを再設定する
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.7;color:#6b7280;padding-bottom:16px;">
                <p style="margin:0 0 8px 0;">※このリンクは発行から1時間のみ有効です。</p>
                <p style="margin:0 0 8px 0;">心当たりがない場合は、このメールを無視してください。アカウントのパスワードは変更されません。</p>
                <p style="margin:0 0 8px 0;">もしボタンをクリックできない場合は、以下のURLをブラウザのアドレスバーにコピー＆ペーストしてください。</p>
                <p style="margin:0;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0ea5e9;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:0 0 4px 0;">当サービスはIRIAM公式ではなく、ライバー向けの非公式スケジュール管理ツールです。</p>
                <p style="margin:0;">本メールにお心当たりがない場合は、このメールを破棄してください。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 6. Reauthentication（再認証）用

### 件名（Subject）

```text
【IRIAM だんごスケジュール】再認証のご確認
```

### テキスト版（Plain text Body）

```text
{{ .Email }} 様

IRIAM だんごスケジュールで、大事な操作を行う前の本人確認として、再度のログインが必要です。

以下のリンクをクリックして、再認証を完了してください。

{{ .ConfirmationURL }}

※このリンクは発行から1時間のみ有効です。

心当たりがない場合は、このメールを無視してください。アカウントの設定は変更されません。

もし上記のリンクをクリックできない場合は、このURLをブラウザのアドレスバーにコピー＆ペーストしてください。

---
当サービスは IRIAM 公式ではなく、ライバー向けの非公式スケジュール管理ツールです。
本メールにお心当たりがない場合は、このメールを破棄してください。
```

### HTML版（HTML Body）

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>再認証のご確認</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <tr>
              <td align="left" style="padding-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:#0ea5e9;">IRIAM だんごスケジュール</div>
                <div style="font-size:18px;font-weight:700;color:#111827;margin-top:4px;">再認証のご確認</div>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#374151;padding-bottom:24px;">
                <p style="margin:0 0 12px 0;">{{ .Email }} 様</p>
                <p style="margin:0 0 12px 0;">IRIAM だんごスケジュールで、大事な操作を行う前の本人確認として、再度のログインが必要です。</p>
                <p style="margin:0 0 12px 0;">以下のボタンをクリックして、再認証を完了してください。</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 32px;border-radius:999px;background-image:linear-gradient(90deg,#0ea5e9,#38bdf8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                  続行する
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;line-height:1.7;color:#6b7280;padding-bottom:16px;">
                <p style="margin:0 0 8px 0;">※このリンクは発行から1時間のみ有効です。</p>
                <p style="margin:0 0 8px 0;">心当たりがない場合は、このメールを無視してください。アカウントの設定は変更されません。</p>
                <p style="margin:0 0 8px 0;">もしボタンをクリックできない場合は、以下のURLをブラウザのアドレスバーにコピー＆ペーストしてください。</p>
                <p style="margin:0;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0ea5e9;text-decoration:underline;">{{ .ConfirmationURL }}</a></p>
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:0 0 4px 0;">当サービスはIRIAM公式ではなく、ライバー向けの非公式スケジュール管理ツールです。</p>
                <p style="margin:0;">本メールにお心当たりがない場合は、このメールを破棄してください。</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

