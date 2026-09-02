import { expect, test, type Page } from "@playwright/test";

// Phase 2 demo path: Siris writes V1 with a typo and a retired handle, the AI
// flags both; she fixes to V2, the AI passes, she submits; Biraj approves V2;
// she edits V3 changing the CTA and marks it material; the record returns to
// Script Approval with the banner; Biraj re-approves.
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
async function saveVersion(page: Page, body: string, summary: string) {
  await page.getByLabel("Script / copy").fill(body);
  await page.getByLabel("Change summary").fill(summary);
  await page.getByRole("button", { name: "Save as new version" }).click();
  await expect(page.getByText(/Saved as V\d+/)).toBeVisible({ timeout: 20_000 });
}
async function runAiCheck(page: Page) {
  await page.getByRole("button", { name: "Run AI check" }).first().click();
  await expect(page.getByText(/AI check complete|showing the stored result/)).toBeVisible({
    timeout: 60_000,
  });
}

test("script gate demo path", async ({ page }) => {
  test.setTimeout(240_000);

  // Siris: create record, move to Script / Copy
  await login(page, "siris@techskills.institute");
  await page.goto("/content/new");
  await page.getByLabel("Title").fill(`Gate e2e ${Date.now()}`);
  await page.getByLabel("Region").selectOption("NP");
  await page.getByLabel("Content type").selectOption({ label: "Reel / short vertical video" });
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page).toHaveURL(/\/content\/TS-NP-\d{4}-\d{3}$/, { timeout: 45_000 });
  const url = page.url();
  await page.getByRole("button", { name: /start concept/i }).click();
  await expect(page.getByText("Idea & Concept").first()).toBeVisible();
  await page.getByRole("button", { name: /start script/i }).click();
  await expect(page.getByText("Script / Copy").first()).toBeVisible();

  // V1 with a typo and the retired handle → flags
  await page.goto(`${url}?tab=script`);
  await saveVersion(
    page,
    "What if your first job started before graduation?\nWe offer a guarenteed job. Follow @techskillsitcareer.",
    "Initial draft",
  );
  await runAiCheck(page);
  await expect(page.getByText(/Retired handle/).first()).toBeVisible();
  await expect(page.getByText(/Spelling \/ grammar/).first()).toBeVisible();
  // Submit exists but AI flagged; still allowed (advisory) — we fix first per the demo
  await saveVersion(
    page,
    "What if your first job started before graduation?\nAt TechSkills Kathmandu you build a real portfolio with mentors.\nBook a free career consultation today.",
    "Fixed typo and handle",
  );
  await runAiCheck(page);
  await expect(page.getByText(/No hard flags/).first()).toBeVisible();
  await page.getByRole("button", { name: /submit v[0-9]+ for approval/i }).click();
  await expect(page.getByText("Script Approval").first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  // Biraj approves V2 from the queue
  await login(page, "biraj@techskills.institute");
  await page.goto("/approvals/scripts");
  const code = url.split("/").pop()!;
  await expect(page.getByText(code).first()).toBeVisible();
  await page.goto(`${url}?tab=script`);
  await page.getByRole("button", { name: /approve v2/i }).click();
  const dlg = page.getByRole("dialog");
  if (await dlg.isVisible().catch(() => false)) {
    await dlg.getByRole("button", { name: /^approve/i }).click();
  }
  await expect(page.getByText("Ready for Production").first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  // Siris edits V3 (CTA change) → material → back to Script Approval with banner
  await login(page, "siris@techskills.institute");
  await page.goto(`${url}?tab=script`);
  await saveVersion(
    page,
    "What if your first job started before graduation?\nAt TechSkills Kathmandu you build a real portfolio with mentors.\nDM us now to enrol.",
    "Changed CTA",
  );
  await expect(page.getByText(/SCRIPT CHANGED AFTER APPROVAL/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^material change$/i }).click();
  const mdlg = page.getByRole("dialog");
  await mdlg.getByRole("textbox").fill("CTA changed from consultation to enrol");
  await mdlg
    .getByRole("button", { name: /material|confirm|save|mark/i })
    .last()
    .click();
  await expect(page.getByText("Script Approval").first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  // Biraj re-approves V3
  await login(page, "biraj@techskills.institute");
  await page.goto(`${url}?tab=script`);
  await page.getByRole("button", { name: /approve v3/i }).click();
  const dlg2 = page.getByRole("dialog");
  if (await dlg2.isVisible().catch(() => false)) {
    await dlg2.getByRole("button", { name: /^approve/i }).click();
  }
  await expect(page.getByText("Ready for Production").first()).toBeVisible({ timeout: 20_000 });
  await page.goto(`${url}?tab=activity`);
  await expect(page.getByText(/Script V2 approved by/).first()).toBeVisible();
  await expect(page.getByText(/Script V3 approved by/).first()).toBeVisible();
  await expect(page.getByText(/MATERIAL/).first()).toBeVisible();
});
