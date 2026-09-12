import { test, expect, type Page } from "@playwright/test";
import { PRE_DISCLAIMER_STATE } from "./auth-state";

// Signed in but with the disclaimer not yet acknowledged (acknowledgement lives in
// localStorage, which this state deliberately omits), so each test sees the dialog
// without spending a sign-in request.
test.use({ storageState: PRE_DISCLAIMER_STATE });

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

test.describe("First-login disclaimer", () => {
  test("shows disclaimer dialog after login", async ({ page }) => {
    await openApp(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText("Before You Begin")).toBeVisible();
    await expect(dialog.getByText("long-running agents")).toBeVisible();
    await expect(dialog.getByText("source database")).toBeVisible();
    await expect(dialog.getByText("personally identifiable")).toBeVisible();
    await expect(dialog.getByText("reviewed before use")).toBeVisible();
  });

  test("continue button is disabled until checkbox is checked", async ({ page }) => {
    await openApp(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const continueBtn = dialog.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();

    await dialog.locator("input[type='checkbox']").check();
    await expect(continueBtn).toBeEnabled();
  });

  test("dismisses disclaimer and does not show again", async ({ page }) => {
    await openApp(page);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.locator("input[type='checkbox']").check();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
  });
});
