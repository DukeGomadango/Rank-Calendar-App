import { test, expect } from "@playwright/test";

test.describe("ランディング・静的ページ", () => {
  test("トップページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/IRIAM|ランク管理/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("新規登録ページが表示される", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("プライバシーポリシーが表示される", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("利用規約が表示される", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms/);
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
