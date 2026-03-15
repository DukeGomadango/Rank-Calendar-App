#!/usr/bin/env node
/**
 * 本番デプロイ前に必須環境変数が設定されているか検証するスクリプト。
 * 使用例: node scripts/validate-env.js
 * CI では: node scripts/validate-env.js をビルド前に実行
 */
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const optional = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
];

const isProd = process.env.NODE_ENV === "production";
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("Error: Missing required environment variables:");
  missing.forEach((key) => console.error("  -", key));
  process.exit(1);
}

if (isProd && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Invite link redemption will fail.");
}

console.log("Required env vars OK.", optional.filter((k) => process.env[k]?.trim()).length, "optional set.");
process.exit(0);
