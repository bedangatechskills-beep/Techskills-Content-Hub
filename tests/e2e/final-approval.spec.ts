import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Phase 5 demo path: Content Review is on; Bedanga rates 3.6 "Recommend With
// Changes"; the checklist shows the threshold failing; Siris overrides with a
// reason; Biraj sees the override and approves; Sumeej uploads a new
// thumbnail and marks it material; the item returns to Biraj with the banner.
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
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
}
function sql(q: string) {
  execSync(
    `"${docker}" exec -i supabase_db_content-hub psql -U postgres -d postgres -c "${q.replace(/"/g, '\\"')}"`,
    { stdio: "ignore" },
  );
}

function setupA(code: string): string {
  const rec = `(select id from public.content_records where content_id='${code}')`;
  const sumeej = `(select id from public.profiles where email='sumeej@techskills.institute')`;
  return [
    `update public.content_records set status_key='production', content_review_required=true, min_reviewer_responses=2, production_folder_url='https://techskills.sharepoint.com/x/${code}', production_assignee_id=${sumeej}, production_manager_id=(select id from public.profiles where email='nil@techskills.institute') where content_id='${code}'`,
    `update public.stage_history set exited_at=now() where exited_at is null and content_id=${rec}`,
    `insert into public.stage_history(content_id,status_key) values (${rec},'production')`,
    `insert into public.script_versions(content_id, version_no, body, approval_status, is_material_change) values (${rec}, 1, 'What if your first job started before graduation? Book a free career consultation today.', 'approved', false)`,
    `update public.content_records set approved_script_version_id=(select id from public.script_versions where content_id=${rec}), current_script_version_id=(select id from public.script_versions where content_id=${rec}) where content_id='${code}'`,
  ].join("; ");
}
function setupB(code: string): string {
  const rec = `(select id from public.content_records where content_id='${code}')`;
  return [
    `insert into public.production_reviews(content_id, creative_version_id, reviewer_id, decision) select id, current_creative_version_id, (select id from public.profiles where email='nil@techskills.institute'), 'pass' from public.content_records where content_id='${code}'`,
    `insert into public.dm_reviews(content_id, creative_version_id, reviewer_id, decision) select id, current_creative_version_id, (select id from public.profiles where email='siris@techskills.institute'), 'approved' from public.content_records where content_id='${code}'`,
    `update public.content_records set status_key='content_review' where content_id='${code}'`,
    `update public.stage_history set exited_at=now() where exited_at is null and content_id=${rec}`,
    `insert into public.stage_history(content_id,status_key) values (${rec},'content_review')`,
  ].join("; ");
}

test("final approval demo path", async ({ page }) => {
  test.setTimeout(300_000);

  await login(page, "siris@techskills.institute");
  await page.goto("/content/new");
  await page.getByLabel("Title").fill(`Final e2e ${Date.now()}`);
  await page.getByLabel("Region").selectOption("NP");
  await page.getByLabel("Content type").selectOption({ label: "Admission poster" });
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page).toHaveURL(/\/content\/TS-NP-\d{4}-\d{3}$/, { timeout: 45_000 });
  const url = page.url();
  const code = url.split("/").pop()!;
  await logout(page);

  // Earlier gates are covered by other specs: jump to Production, upload a real creative (auto AI check), then to Content Review.
  sql(setupA(code));
  await login(page, "sumeej@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page.getByLabel("File").setInputFiles(POSTER);
  await page.getByRole("button", { name: /upload review version/i }).click();
  await expect(page.getByText(/Review version uploaded|Uploaded/).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);
  await logout(page);
  sql(setupB(code));

  // Bedanga rates 3.6 with Recommend With Changes
  await login(page, "app@techskills.institute");
  await page.goto("/reviews/content");
  await expect(page.getByText(code).first()).toBeVisible();
  await page.goto(`/reviews/content/${code}`);
  const values = [4, 4, 4, 4, 4, 3, 3, 3, 3];
  const groups = page.getByRole("radiogroup");
  for (let i = 0; i < values.length; i++) {
    await groups
      .nth(i)
      .getByRole("radio", { name: new RegExp(`: ${values[i]} of 5$`) })
      .check({ force: true });
  }
  await page.getByLabel("Decision").selectOption("recommend_with_changes");
  await page.getByLabel(/Comment/).fill("Hook is weak and the CTA is buried");
  await page.getByRole("button", { name: /submit rating/i }).click();
  await expect(page).toHaveURL(/\/reviews\/content$/, { timeout: 30_000 });
  await logout(page);

  // Siris: threshold failing → override with reason → complete → run AI check → submit
  await login(page, "siris@techskills.institute");
  await page.goto(`${url}?tab=reviews`);
  await expect(page.getByText(/3\.5\d? vs 4/).first()).toBeVisible();
  await page
    .getByRole("button", { name: /override/i })
    .first()
    .click();
  let dlg = page.getByRole("dialog");
  await dlg
    .getByRole("textbox")
    .fill("One senior reviewer is enough for a routine poster; hook accepted as is");
  await dlg.getByRole("button", { name: /record override/i }).click();
  await expect(page.getByText(/Override recorded/).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /^complete content review$/i }).click();
  await expect(page.getByText(/Ready for Final Approval/).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.goto(`${url}?tab=reviews`);
  await page.getByRole("button", { name: /submit for final approval/i }).click();
  await expect(page.getByText(/Submitted for final approval/).first()).toBeVisible({
    timeout: 20_000,
  });
  await logout(page);

  // Biraj sees the override and approves
  await login(page, "biraj@techskills.institute");
  await page.goto("/approvals/final");
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText(/1 override/).first()).toBeVisible();
  await page.goto(`/approvals/final/${code}`);
  await expect(page.getByText(/One senior reviewer is enough/).first()).toBeVisible();
  await page
    .getByRole("button", { name: /^final approve$/i })
    .first()
    .click();
  dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: /^final approve$/i }).click();
  await expect(page).toHaveURL(/\/approvals\/final$/, { timeout: 30_000 });
  await logout(page);

  // Sumeej uploads a new thumbnail and marks it material → back to Biraj with the banner
  await login(page, "sumeej@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page.getByLabel("File").setInputFiles(POSTER);
  await page.getByLabel("Kind").selectOption("thumbnail");
  await page.getByRole("button", { name: /upload review version/i }).click();
  await expect(page.getByText(/Review version uploaded|Uploaded/).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.goto(`${url}?tab=reviews`);
  await expect(page.getByText(/CREATIVE CHANGED AFTER FINAL APPROVAL/i).first()).toBeVisible();
  await page.getByRole("button", { name: /^material change$/i }).click();
  dlg = page.getByRole("dialog");
  await dlg.getByRole("textbox").fill("New thumbnail with a different headline");
  await dlg.getByRole("button", { name: /mark material/i }).click();
  await expect(page.getByText(/Sent back for CEO re-approval/).first()).toBeVisible({
    timeout: 20_000,
  });
  await logout(page);

  await login(page, "biraj@techskills.institute");
  await page.goto("/approvals/final");
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText(/Re-approval/).first()).toBeVisible();
  await page.goto(`${url}?tab=activity`);
  await expect(page.getByText(/gave final approval/).first()).toBeVisible();
  await expect(page.getByText(/MATERIAL change after final approval/).first()).toBeVisible();
});
