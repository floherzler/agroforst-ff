import { expect, test } from "@playwright/test";

test("home page renders primary CTA", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /vom agroforst/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /kostenloses konto erstellen/i })).toBeVisible();
});

test("login page renders and preserves signup redirect", async ({ page }) => {
  await page.goto("/login?redirect=/konto");

  await expect(page.getByRole("heading", { name: /willkommen zurück/i })).toBeVisible();
  await expect(page.getByLabel(/email-adresse/i)).toBeVisible();
  await expect(page.getByLabel(/passwort/i)).toBeVisible();

  await page.getByRole("link", { name: /jetzt registrieren/i }).click();
  await expect(page).toHaveURL(/\/signup\?redirect=%2Fkonto$/);
});

test("signup page renders with account form", async ({ page }) => {
  await page.goto("/signup?redirect=/konto");

  await expect(page.getByRole("heading", { name: /willkommen im agroforst/i })).toBeVisible();
  await expect(page.getByLabel(/^name$/i)).toBeVisible();
  await expect(page.getByLabel(/email-adresse/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /konto erstellen/i })).toBeVisible();
});

test("verify-email without params shows missing state", async ({ page }) => {
  await page.goto("/verify-email");

  await expect(page.getByRole("heading", { name: /email-verifizierung/i })).toBeVisible();
  await expect(page.getByText(/verifizierungsdaten fehlen/i)).toBeVisible();
});

test("marktplatz route renders page shell", async ({ page }) => {
  await page.goto("/marktplatz");

  await expect(page.getByRole("heading", { name: /^marktplatz$/i })).toBeVisible();
  await expect(page.getByPlaceholder(/suchen/i)).toBeVisible();
});
