import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Phase 4 demo path: Sumeej's poster has "Kathamndu" and the retired handle
// (the mock provider reads these from the upload note). The gate flags both;
// Siris requests changes; Sumeej uploads V2; the gate re-runs clean; Siris
// approves; the record lands in Ready for Final Approval.
const PASSWORD = "Password123!";
const POSTER = path.join(__dirname, "fixtures", "poster.png");
const docker =
  "C:/Users/Bedanga.BEDANGA-PC/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}
async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
}
async function uploadPoster(page: Page, note?: string) {
  await page.getByLabel("File").setInputFiles(POSTER);
  if (note) await page.getByLabel("Note").fill(note);
  await page.getByRole("button", { name: /upload review version/i }).click();
  await expect(page.getByText(/Review version uploaded|Uploaded/).first()).toBeVisible({
    timeout: 60_000,
  });
}
function sql(q: string) {
  execSync(
    `"${docker}" exec -i supabase_db_content-hub psql -U postgres -d postgres -c "${q.replace(/"/g, '\\"')}"`,
    { stdio: "ignore" },
  );
}

test("creative gate demo path", async ({ page }) => {
  test.setTimeout(300_000);

  await login(page, "siris@techskills.institute");
  await page.goto("/content/new");
  await page.getByLabel("Title").fill(`Creative e2e ${Date.now()}`);
  await page.getByLabel("Region").selectOption("NP");
  await page.getByLabel("Content type").selectOption({ label: "Admission poster" });
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page).toHaveURL(/\/content\/TS-NP-\d{4}-\d{3}$/, { timeout: 45_000 });
  const url = page.url();
  const code = url.split("/").pop()!;
  await logout(page);

  // Jump to Production with Sumeej assigned and the folder set (earlier phases cover those steps)
  sql(
    `update public.content_records set status_key='production', production_folder_url='https://techskills.sharepoint.com/x/${code}', production_assignee_id=(select id from public.profiles where email='sumeej@techskills.institute'), production_manager_id=(select id from public.profiles where email='nil@techskills.institute') where content_id='${code}'; update public.stage_history set exited_at=now() where exited_at is null and content_id=(select id from public.content_records where content_id='${code}'); insert into public.stage_history(content_id,status_key) select id,'production' from public.content_records where content_id='${code}'; insert into public.script_versions(content_id, version_no, body, approval_status, is_material_change) select id, 1, 'What if your first job started before graduation? Book a free career consultation today.', 'approved', false from public.content_records where content_id='${code}'; update public.content_records set approved_script_version_id=(select id from public.script_versions where content_id=(select id from public.content_records where content_id='${code}')), current_script_version_id=(select id from public.script_versions where content_id=(select id from public.content_records where content_id='${code}')) where content_id='${code}';`,
  );

  // Sumeej uploads the flawed poster → the gate runs automatically and flags both defects
  await login(page, "sumeej@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await uploadPoster(page, "mock: typo Kathamndu; handle @techskillsitcareer");
  await page.reload();
  await expect(page.getByText(/Contact details or handle wrong/).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/^Spelling$/).first()).toBeVisible();
  await page.getByRole("button", { name: /submit for production review/i }).click();
  await expect(page.getByText(/Submitted for production review/).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  await logout(page);

  // Nil passes production review (technical quality); the gate result is already attached
  await login(page, "nil@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page.getByRole("button", { name: /pass production review/i }).click();
  await expect(page.getByText(/Production review passed/).first()).toBeVisible({ timeout: 30_000 });
  await logout(page);

  // Siris sees the flags first in the DM queue and requests changes
  await login(page, "siris@techskills.institute");
  await page.goto("/reviews/dm");
  await expect(page.getByText(code).first()).toBeVisible();
  await page.goto(`/reviews/dm/${code}`);
  await expect(page.getByText(/Contact details or handle wrong/).first()).toBeVisible();
  await page.getByLabel("Feedback").fill("Fix the spelling of Kathmandu and use the active handle");
  await page
    .getByRole("button", { name: /^request changes$/i })
    .first()
    .click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: /request changes/i }).click();
  await expect(page).toHaveURL(/\/reviews\/dm$/, { timeout: 30_000 });
  await logout(page);

  // Sumeej resolves the request, routes back to Production, uploads a clean V2, resubmits
  await login(page, "sumeej@techskills.institute");
  await page.goto(`${url}?tab=reviews`);
  await expect(page.getByText("Changes Required").first()).toBeVisible();
  await page
    .getByRole("button", { name: /resolve/i })
    .first()
    .click();
  const rdlg = page.getByRole("dialog");
  await rdlg
    .getByRole("button", { name: /resolve/i })
    .last()
    .click();
  await expect(page.getByText(/Change request resolved/).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /send back to production/i }).click();
  await page.waitForTimeout(3000);
  await page.goto(`${url}?tab=production`);
  await expect(page.getByRole("button", { name: /submit for production review/i })).toBeVisible({
    timeout: 20_000,
  });
  await uploadPoster(page);
  await page.reload();
  await expect(page.getByText(/No hard flags/).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /submit for production review/i }).click();
  await expect(page.getByText(/Submitted for production review/).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  await logout(page);

  await login(page, "nil@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page.getByRole("button", { name: /pass production review/i }).click();
  await expect(page.getByText(/Production review passed/).first()).toBeVisible({ timeout: 30_000 });
  await logout(page);

  // Siris approves; record lands in Ready for Final Approval
  await login(page, "siris@techskills.institute");
  await page.goto(`/reviews/dm/${code}`);
  await expect(page.getByText(/No hard flags/).first()).toBeVisible();
  await page.getByRole("button", { name: /approve dm review/i }).click();
  const adlg = page.getByRole("dialog");
  await adlg
    .getByRole("button", { name: /approve/i })
    .last()
    .click();
  await expect(page).toHaveURL(/\/reviews\/dm$/, { timeout: 30_000 });
  await page.goto(`${url}?tab=activity`);
  await expect(page.getByText("Ready for Final Approval").first()).toBeVisible();
  await expect(page.getByText(/requested 1 change/).first()).toBeVisible();
  await expect(page.getByText(/AI creative check on creative V2/).first()).toBeVisible();
});
