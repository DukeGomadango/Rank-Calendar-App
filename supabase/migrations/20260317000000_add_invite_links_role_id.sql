-- 招待リンクにロールを紐づけ。redeem 時にこのロールで自動で share を作成できるようにする。
ALTER TABLE iriam.invite_links
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES iriam.roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN iriam.invite_links.role_id IS 'このリンクで参加したユーザーに自動付与するロール。null の場合は手動で付与。';
