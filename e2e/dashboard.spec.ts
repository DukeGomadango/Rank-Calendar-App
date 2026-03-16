import { test, expect } from "@playwright/test";

test.describe("ダッシュボード（認証済み）", () => {
  test("ダッシュボード TOP が表示される", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
    await expect(
      page.getByRole("heading", { name: /ダッシュボード|オンボーディング/ })
    ).toBeVisible();
  });

  test("カレンダー・データ・イベント・設定へのリンクが表示される", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

    await expect(page.getByRole("link", { name: /ホーム/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /カレンダー/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /データ/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /イベント/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /設定/ })).toBeVisible();
  });
});
