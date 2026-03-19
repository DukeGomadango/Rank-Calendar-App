import * as fs from "node:fs";
import * as path from "node:path";

import { chromium } from "@playwright/test";

/**
 * E2E 認証用の storageState を保存する。
 * E2E_TEST_SECRET / E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD が設定されている場合のみ実行。
 */
export default async function globalSetup() {
  const secret = process.env.E2E_TEST_SECRET;
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!secret || !email || !password) {
    console.warn(
      "[e2e] E2E_TEST_SECRET / E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD が未設定のため、認証状態の保存をスキップします。認証付き E2E はスキップされるか失敗します。"
    );
    return;
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, "user.json");

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  await context.setExtraHTTPHeaders({ "x-e2e-secret": secret });
  const page = await context.newPage();

  const response = await page.goto("/api/e2e-login", {
    waitUntil: "networkidle",
  });

  if (!response?.ok() && response?.status() !== 302) {
    console.warn(
      `[e2e] /api/e2e-login の応答が不正です (status=${response?.status()})。認証付き E2E が失敗する可能性があります。`
    );
    await browser.close();
    return;
  }

  try {
    await page.waitForURL(/\/(dashboard|login)/, { waitUntil: "domcontentloaded" });
  } catch (err) {
    console.warn(
      `[e2e] ログイン後のURL遷移待ちに失敗しました。storageState を保存して継続します（err=${String(
        err
      )}）`
    );
  }

  await context.storageState({ path: statePath });
  await browser.close();
  console.log("[e2e] 認証状態を保存しました:", statePath);
}
