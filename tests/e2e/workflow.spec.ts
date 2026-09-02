import { expect, test, type Page } from "@playwright/test";

// Demo path from Plans/Phase 1: Siris creates a record and moves it to Script;
// Sumeej cannot move it forward; Nil moves it backward with a reason; the
// Activity tab shows every event. Requires local Supabase + seed_local_auth.
const PASSWORD = "Password123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}
async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("demo path: create, move, refuse, move back with reason, audit", async ({ page }) => {
  test.setTimeout(120_000);
  const title = `E2E reel ${Date.now()}`;

  await login(page, "siris@techskills.institute");
  await page.goto("/content/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Region").selectOption("NP");
  const typeSelect = page.getByLabel("Content type");
  await typeSelect.selectOption({ label: "Reel / short vertical video" });
  await page.getByLabel("Hook").fill("Your first job before graduation");
  await page.getByRole("button", { name: /create/i }).click();

  await expect(page).toHaveURL(/\/content\/TS-NP-\d{4}-\d{3}$/);
  const url = page.url();
  const code = url.split("/").pop()!;
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText("Requested / Planned").first()).toBeVisible();

  await page.getByRole("button", { name: /start concept/i }).click();
  await expect(page.getByText("Idea & Concept").first()).toBeVisible();
  await page.getByRole("button", { name: /start script/i }).click();
  await expect(page.getByText("Script / Copy").first()).toBeVisible();
  await logout(page);

  // Production user sees no forward action to Final Approved and none to approve
  await login(page, "sumeej@techskills.institute");
  await page.goto(url);
  await expect(page.getByRole("button", { name: /final approv/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /submit for script approval/i })).toHaveCount(0);
  await logout(page);

  // Production manager moves it backward with a reason
  await login(page, "nil@techskills.institute");
  await page.goto(url);
  await page.getByRole("button", { name: /back to concept/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("Hook needs a stronger opening line");
  await dialog.getByRole("button", { name: /move to/i }).click();
  await expect(page.getByText("Idea & Concept").first()).toBeVisible();

  await page.goto(`${url}?tab=activity`);
  await expect(page.getByText(/created .*"/).first()).toBeVisible();
  await expect(page.getByText(/Requested \/ Planned → Idea & Concept/).first()).toBeVisible();
  await expect(page.getByText(/Idea & Concept → Script \/ Copy/).first()).toBeVisible();
  await expect(page.getByText(/Script \/ Copy → Idea & Concept/).first()).toBeVisible();
  await expect(page.getByText("Hook needs a stronger opening line")).toBeVisible();

  // Board shows the card in its column
  await page.goto("/board");
  await expect(page.getByText(code).first()).toBeVisible();
});
