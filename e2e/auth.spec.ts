import { test, expect } from "@playwright/test";

test.describe("認証フロー", () => {
  test("ログインページが表示され、サインアップページへ遷移できる", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await expect(page.getByRole("link", { name: "新規登録" })).toBeVisible();

    await page.getByRole("link", { name: "新規登録" }).click();
    await expect(page).toHaveURL(/\/signup/);
    // signup は通常「アカウントを新規作成」。Suspense fallback では「新規登録」になる場合がある
    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText(/アカウントを新規作成|新規登録/);
  });

  test("サインアップページからログインページへ戻れる", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);
    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText(/アカウントを新規作成|新規登録/);

    await page.getByRole("link", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  });

  test("未ログインでオンボーディングページにアクセスするとログインへリダイレクトされる", async ({ page }) => {
    await page.goto("/dashboard/onboarding");
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  });
});

