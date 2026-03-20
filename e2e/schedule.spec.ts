import { test, expect } from "@playwright/test";
import dayjs from "dayjs";

test.describe("スケジュール・カレンダー（認証済み）", () => {
  test("カレンダーページが表示される", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await expect(page).toHaveURL(/\/dashboard\/calendar/);
    await expect(
      page.getByRole("link", { name: /カレンダー/ }).first()
    ).toBeVisible();
  });

  test("週ビュー: 予定クリックは即モーダルにせずプレビューから編集できる", async ({
    page,
  }) => {
    await page.goto("/dashboard/calendar");
    await expect(page).toHaveURL(/\/dashboard\/calendar/);

    await page.getByRole("button", { name: "週" }).click();

    const block = page.locator('[data-schedule-block="1"]').first();
    if (!(await block.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await block.click();
    await expect(
      page.getByRole("heading", { name: "日別スケジュールの編集" })
    ).not.toBeVisible();

    await page.getByRole("button", { name: "予定を編集" }).click();
    await expect(
      page.getByRole("heading", { name: "日別スケジュールの編集" })
    ).toBeVisible({ timeout: 10_000 });
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

  test("カレンダー編集モーダル保存で表示が巻き戻らない", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await expect(page).toHaveURL(/\/dashboard\/calendar/);

    // 今日のセルを開く（セル内に「今日」バッジがある）
    await page.getByRole("button", { name: /今日/ }).first().click();
    await expect(page.getByRole("heading", { name: "日別スケジュールの編集" })).toBeVisible();

    // 目標+を変更して保存
    const targetSelect = page.getByRole("combobox", { name: "目標+" });
    const before = await targetSelect.inputValue();
    const next = before === "6" ? "8" : "6";
    await targetSelect.selectOption(next);

    const saveButton = page.getByRole("button", { name: "保存する" });
    await saveButton.click();

    // ここが肝: 保存直後に一瞬戻らないことを、短時間で連続確認する
    await expect(targetSelect).toHaveValue(next, { timeout: 10_000 });
    await page.waitForTimeout(150);
    await expect(targetSelect).toHaveValue(next);
    await page.waitForTimeout(150);
    await expect(targetSelect).toHaveValue(next);

    // さらに、トースト（「保存しました」）が表示されても値が維持されること
    await expect(page.getByText("保存しました")).toBeVisible({ timeout: 10_000 });
    await expect(targetSelect).toHaveValue(next);

    // モーダルを閉じて、同じ日のセル表示も反映されていること（最低限：達成バッジ等で日付セルが更新される）
    await page.getByRole("button", { name: "閉じる" }).click();
    const todayDate = dayjs().date();
    // カレンダー内に今日の日付が見える（巻き戻りで空になると検知しづらいので最低限の存在確認）
    await expect(page.getByRole("button", { name: new RegExp(String(todayDate)) }).first()).toBeVisible();
  });
});
