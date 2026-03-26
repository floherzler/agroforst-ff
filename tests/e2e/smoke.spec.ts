import { expect, test } from "@playwright/test";

test("home page renders primary CTA", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByText(
      /agroforst, produkte und neuigkeiten in einer klaren ersten version/i,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /neuigkeiten erhalten/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/hier werden bald die angebote leben/i),
  ).toBeVisible();
});

test("login page renders and preserves signup redirect", async ({ page }) => {
  await page.goto("/login?redirect=/konto");

  await expect(page.getByText(/willkommen zurück/i)).toBeVisible();
  await expect(page.getByLabel(/email-adresse/i)).toBeVisible();
  await expect(page.getByLabel(/passwort/i)).toBeVisible();

  await page.getByRole("link", { name: /jetzt registrieren/i }).click();
  await expect(page).toHaveURL(/\/signup\?redirect=%2Fkonto$/);
});

test("signup page renders with account form", async ({ page }) => {
  await page.goto("/signup?redirect=/konto");

  await expect(page.getByText(/willkommen im agroforst/i)).toBeVisible();
  await expect(page.getByLabel(/^name$/i)).toBeVisible();
  await expect(page.getByLabel(/email-adresse/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /konto erstellen/i })).toBeVisible();
});

test("verify-email without params shows missing state", async ({ page }) => {
  await page.goto("/verify-email");

  await expect(page.getByText(/email-verifizierung/i)).toBeVisible();
  await expect(page.getByText(/verifizierungsdaten fehlen/i)).toBeVisible();
});

test("products route renders public catalog", async ({ page }) => {
  await page.goto("/produkte");

  await expect(page.getByRole("heading", { name: /^produkte$/i })).toBeVisible();
  await expect(page.getByPlaceholder(/suchen/i)).toBeVisible();
  await expect(page.getByText(/realtime via appwrite/i)).toBeVisible();
});
