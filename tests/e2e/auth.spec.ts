import { expect, test } from "@playwright/test";

// Requires local Supabase with seed_local_auth.sql applied.
const PASSWORD = "Password123!";

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers/);
});

test("super admin can log in, see admin nav, and log out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("app@techskills.institute");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("non-admin sees no admin nav and gets 403 on admin routes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("sumeej@techskills.institute");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /not allowed/i })).toBeVisible();
});
