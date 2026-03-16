import { test, expect } from "@playwright/test";

test.describe("スケジュール・カレンダー（認証済み）", () => {
  test("カレンダーページが表示される", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await expect(page).toHaveURL(/\/dashboard\/calendar/);
    await expect(
      page.getByRole("link", { name: /カレンダー/ }).first()
    ).toBeVisible();
  });

  test("データ表ページが表示される", async ({ page }) => {
    await page.goto("/dashboard/data");
    await expect(page).toHaveURL(/\/dashboard\/data/);
    await expect(
      page.getByRole("link", { name: /データ/ }).first()
    ).toBeVisible();
  });

  test("今日の目標+を入力して保存すると一覧に反映される", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

    // オンボーディング未完了の場合はスキップ（E2E ユーザーが未設定のとき）
    const heading = page.getByRole("heading", { name: /ダッシュボード|オンボーディング/ });
    await expect(heading).toBeVisible();
    if (await page.getByRole("heading", { name: /オンボーディング/ }).isVisible()) {
      test.skip();
    }

    // 「今日のスケジュールを登録」フォームで目標+・実績+を選択
    const targetSelect = page.getByRole("combobox", { name: /今日の \+目標/ });
    const actualSelect = page.getByRole("combobox", { name: /今日の \+実績/ });
    await expect(targetSelect.first()).toBeVisible({ timeout: 10_000 });

    await targetSelect.first().selectOption("6");
    await actualSelect.first().selectOption("6");

    const saveButton = page.getByRole("button", { name: "保存する" });
    await saveButton.first().click();

    await expect(saveButton.first()).toBeEnabled({ timeout: 15_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);

    const targetAfter = page.getByRole("combobox", { name: /今日の \+目標/ }).first();
    await expect(targetAfter).toHaveValue("6", { timeout: 10_000 });
  });
});
