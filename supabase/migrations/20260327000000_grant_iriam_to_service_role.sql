-- サービスロールが招待トークン検証・招待 redeem 時の share 作成で iriam にアクセスできるようにする。
-- getInviteLinkByTokenForRedeem: SELECT invite_links
-- upsertShareWithServiceRole: UPSERT shares

GRANT USAGE ON SCHEMA iriam TO service_role;
GRANT SELECT ON iriam.invite_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON iriam.shares TO service_role;
