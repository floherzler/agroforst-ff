import { expect, test } from "@playwright/test";

test("konto redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/konto");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fkonto$/);
  await expect(page.getByRole("heading", { name: /willkommen zurück/i })).toBeVisible();
});

test("zentrale redirects unauthenticated users to home", async ({ page }) => {
  await page.goto("/zentrale");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /vom agroforst/i })).toBeVisible();
});
